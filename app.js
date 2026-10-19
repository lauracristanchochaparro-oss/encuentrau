
const formulario = document.getElementById("formulario");
const listaObjetos = document.getElementById("listaObjetos");
const busqueda = document.getElementById("busqueda");
const mensaje = document.getElementById("mensaje");
const campoFecha = document.getElementById("fecha");
const campoFoto = document.getElementById("foto");
const vistaPreviaFoto = document.getElementById("vistaPreviaFoto");
const imagenPrevia = document.getElementById("imagenPrevia");

const MAX_TAMANO_FOTO = 5 * 1024 * 1024;
const MAX_DIMENSION_FOTO = 900;
const CLAVE_OBJETOS = "encuentrau_objetos";

let objetos = [];
let fotoSeleccionada = null;

function mostrarMensaje(texto, tipo = "info") {
  mensaje.textContent = texto;
  mensaje.dataset.tipo = tipo;
}

function establecerFechaActual() {
  const hoy = new Date();
  campoFecha.value =
    `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
}

function guardarObjetos() {
  localStorage.setItem(CLAVE_OBJETOS, JSON.stringify(objetos));
}

function cargarObjetos() {
  try {
    const guardados = JSON.parse(localStorage.getItem(CLAVE_OBJETOS) || "[]");
    objetos = Array.isArray(guardados) ? guardados : [];
    mostrarObjetos();
    actualizarIndicadores();
    mostrarMensaje(
      objetos.length
        ? "Objetos cargados correctamente."
        : "Todavía no hay objetos registrados.",
      "info"
    );
  } catch (error) {
    console.error("Error al cargar objetos:", error);
    mostrarMensaje("No se pudieron cargar los objetos guardados.", "error");
  }
}

function actualizarIndicadores() {
  document.getElementById("total").textContent = objetos.length;
  document.getElementById("disponibles").textContent =
    objetos.filter(o => o.estado === "Disponible").length;
  document.getElementById("entregados").textContent =
    objetos.filter(o => o.estado === "Entregado").length;
}

function comprimirFoto(archivo) {
  return new Promise((resolve, reject) => {
    if (!archivo) return resolve(null);

    if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type)) {
      return reject(new Error("Selecciona una imagen JPG, PNG o WebP."));
    }

    if (archivo.size > MAX_TAMANO_FOTO) {
      return reject(new Error("La fotografía no puede superar los 5 MB."));
    }

    const lector = new FileReader();

    lector.onerror = () => reject(new Error("No se pudo abrir la fotografía."));

    lector.onload = () => {
      const imagen = new Image();

      imagen.onerror = () => reject(new Error("No se pudo leer la fotografía."));

      imagen.onload = () => {
        const escala = Math.min(
          1,
          MAX_DIMENSION_FOTO / imagen.width,
          MAX_DIMENSION_FOTO / imagen.height
        );

        const canvas = document.createElement("canvas");
        canvas.width = Math.round(imagen.width * escala);
        canvas.height = Math.round(imagen.height * escala);

        canvas.getContext("2d").drawImage(
          imagen, 0, 0, canvas.width, canvas.height
        );

        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };

      imagen.src = lector.result;
    };

    lector.readAsDataURL(archivo);
  });
}

campoFoto.addEventListener("change", async () => {
  const archivo = campoFoto.files[0];
  fotoSeleccionada = null;
  vistaPreviaFoto.hidden = true;
  imagenPrevia.removeAttribute("src");

  if (!archivo) return;

  try {
    fotoSeleccionada = await comprimirFoto(archivo);
    imagenPrevia.src = fotoSeleccionada;
    vistaPreviaFoto.hidden = false;
    mostrarMensaje("Fotografía preparada correctamente.", "exito");
  } catch (error) {
    campoFoto.value = "";
    mostrarMensaje(error.message, "error");
  }
});

function mostrarObjetos() {
  const termino = busqueda.value.trim().toLowerCase();

  const filtrados = objetos.filter(objeto => {
    const contenido = [
      objeto.codigo, objeto.nombre, objeto.categoria,
      objeto.lugar, objeto.fecha, objeto.estado
    ].join(" ").toLowerCase();

    return contenido.includes(termino);
  });

  listaObjetos.replaceChildren();

  if (!filtrados.length) {
    const aviso = document.createElement("p");
    aviso.textContent = termino
      ? "No se encontraron objetos con esa búsqueda."
      : "No hay objetos registrados todavía.";
    listaObjetos.appendChild(aviso);
    return;
  }

  filtrados.forEach(objeto => {
    const tarjeta = document.createElement("article");
    tarjeta.className = "objeto";

    const titulo = document.createElement("h3");
    titulo.textContent = objeto.nombre;
    tarjeta.appendChild(titulo);

    if (objeto.foto_url) {
      const imagen = document.createElement("img");
      imagen.src = objeto.foto_url;
      imagen.alt = `Fotografía de ${objeto.nombre}`;
      imagen.loading = "lazy";
      imagen.style.maxWidth = "100%";
      imagen.style.maxHeight = "220px";
      imagen.style.objectFit = "contain";
      imagen.style.borderRadius = "8px";
      imagen.onerror = () => { imagen.hidden = true; };
      tarjeta.appendChild(imagen);
    }

    [
      ["Categoría", objeto.categoria],
      ["Lugar", objeto.lugar],
      ["Fecha", objeto.fecha],
      ["Código", objeto.codigo]
    ].forEach(([etiqueta, valor]) => {
      const parrafo = document.createElement("p");
      const negrita = document.createElement("strong");
      negrita.textContent = `${etiqueta}: `;
      parrafo.append(negrita, document.createTextNode(valor || ""));
      tarjeta.appendChild(parrafo);
    });

    const estado = document.createElement("p");
    estado.className = "estado";
    estado.textContent = `Estado: ${objeto.estado}`;
    tarjeta.appendChild(estado);

    if (objeto.estado === "Disponible") {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.textContent = "Marcar como entregado";
      boton.addEventListener("click", () => marcarComoEntregado(objeto.codigo));
      tarjeta.appendChild(boton);
    }

    listaObjetos.appendChild(tarjeta);
  });
}

function marcarComoEntregado(codigo) {
  const objeto = objetos.find(o => o.codigo === codigo);

  if (!objeto) {
    mostrarMensaje("No se encontró el objeto.", "error");
    return;
  }

  objeto.estado = "Entregado";

  try {
    guardarObjetos();
    mostrarObjetos();
    actualizarIndicadores();
    mostrarMensaje("Objeto marcado como entregado.", "exito");
  } catch (error) {
    console.error("Error al guardar el cambio:", error);
    mostrarMensaje("No se pudo guardar el cambio en este navegador.", "error");
  }
}

formulario.addEventListener("submit", evento => {
  evento.preventDefault();

  const nombre = document.getElementById("nombre").value.trim();
  const categoria = document.getElementById("categoria").value;
  const lugar = document.getElementById("lugar").value.trim();
  const fecha = campoFecha.value;

  if (!nombre || !categoria || !lugar || !fecha) {
    mostrarMensaje("Completa todos los campos obligatorios.", "error");
    return;
  }

  const boton = formulario.querySelector('button[type="submit"]');
  boton.disabled = true;

  try {
    const codigo = `EU-${Date.now().toString().slice(-8)}`;

    objetos.unshift({
      codigo,
      nombre,
      categoria,
      lugar,
      fecha,
      estado: "Disponible",
      foto_url: fotoSeleccionada || null
    });

    guardarObjetos();
    formulario.reset();
    fotoSeleccionada = null;
    vistaPreviaFoto.hidden = true;
    imagenPrevia.removeAttribute("src");
    establecerFechaActual();
    mostrarObjetos();
    actualizarIndicadores();
    mostrarMensaje(`¡Objeto registrado correctamente! Código: ${codigo}`, "exito");
  } catch (error) {
    console.error("Error al guardar el objeto:", error);
    mostrarMensaje(
      "No se pudo guardar. Puede que el navegador no tenga espacio disponible.",
      "error"
    );
  } finally {
    boton.disabled = false;
    boton.textContent = "Registrar objeto";
  }
});

busqueda.addEventListener("input", mostrarObjetos);

establecerFechaActual();
cargarObjetos();
