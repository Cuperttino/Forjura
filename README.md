# Hierro

Web app para registrar el progreso en el gimnasio: rutina semanal, pesos, series, repeticiones, notas, temporizador de descanso e historial con gráficas. Se adapta al móvil, con botones grandes y pocos toques, y al ordenador, con menú lateral y paneles en paralelo.

No necesita cuenta ni servidor. Cada persona escribe su nombre y sus datos se quedan en su propio navegador.

## Publicarla con GitHub Pages

1. Crea un repositorio en GitHub y sube todo el contenido de esta carpeta, incluido `.nojekyll`.
2. En el repositorio, entra en **Settings → Pages**.
3. En **Source** elige **Deploy from a branch**, la rama `main` y la carpeta `/ (root)`. Pulsa **Save**.
4. En un par de minutos estará en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPOSITORIO/`.

## Instalarla en el móvil

- **iPhone:** abre la dirección en Safari, pulsa Compartir y luego **Añadir a pantalla de inicio**.
- **Android:** abre la dirección en Chrome, abre el menú y pulsa **Instalar aplicación**.
- **Ordenador:** basta con abrir la dirección en el navegador. En Chrome o Edge también puedes instalarla desde el icono de la barra de direcciones; en Safari para Mac, con Archivo → Añadir al Dock.

En el ordenador, al registrar una serie puedes usar las flechas arriba y abajo para cambiar el valor y Enter para guardar.

Una vez instalada funciona también sin conexión.

## Dónde se guardan los datos

Todo se guarda en el `localStorage` del navegador de cada persona. Nada se envía a ningún servidor, así que los datos no pasan de un dispositivo a otro. Para cambiar de móvil o guardar una copia, usa **Ajustes → Descargar copia de seguridad** y luego **Restaurar una copia**.

En iPhone conviene instalar la app en la pantalla de inicio, porque Safari puede borrar los datos de las webs que llevan varios días sin abrirse.

## Estructura

```
index.html             La app completa: HTML, CSS y JavaScript
manifest.webmanifest   Nombre e iconos para instalarla
sw.js                  Copia local para que funcione sin conexión
icons/                 Iconos de la app
img/                   Imágenes del día (generadas por ordenador en 3D, sin derechos de terceros)
```

No hay que compilar nada. Para probarla en tu ordenador, ejecuta `python3 -m http.server` en esta carpeta y abre `http://localhost:8000`.
