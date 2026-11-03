<picture>
  <source media="(prefers-color-scheme: dark)" srcset="brand/forjura-horizontal-claro.svg">
  <img src="brand/forjura-horizontal-oscuro.svg" alt="FORJURA" height="72">
</picture>


Web app para registrar el progreso en el gimnasio: rutina semanal, pesos, series, repeticiones, notas, temporizador de descanso, historial con gráficas, peso corporal con objetivo, generador de rutinas y consejos de nutrición con IA, y ficha de tu gimnasio con su horario. Se adapta al móvil, con botones grandes y pocos toques, y al ordenador, con menú lateral y paneles en paralelo.

Con una cuenta de Puter, el progreso se sincroniza entre todos los dispositivos. También se puede usar sin cuenta, y entonces los datos se quedan en ese navegador.

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

- **Con cuenta:** la app usa [Puter](https://puter.com) para el inicio de sesión y la nube. Cada usuario crea su cuenta en Puter, y su rutina e historial se guardan en ella, separados de los de otros usuarios. Cada dispositivo guarda además una copia local para funcionar sin conexión. El almacenamiento corre a cargo de la cuenta de cada usuario.
- **Sin cuenta:** todo se queda en el `localStorage` de ese navegador. En iPhone conviene instalar la app en la pantalla de inicio, porque Safari puede borrar los datos de las webs que llevan varios días sin abrirse.

Si dos dispositivos cambian lo mismo sin conexión, se conserva la versión más reciente de cada sección y de cada sesión. Las copias de seguridad están en **Ajustes**.

## Servicios externos

- **IA (Puter):** rutinas y consejos. Se envían las respuestas del usuario, nunca su nombre; el peso y la altura solo con su permiso. Cada usuario paga su propio uso desde su cuenta de Puter.
- **OpenStreetMap (Nominatim y Overpass):** búsqueda de gimnasios y horarios. Datos © colaboradores de OpenStreetMap. No da horarios en tiempo real, así que el estado se calcula con el horario habitual y se indica siempre.

Lo que genera la IA es orientación general. No es un diagnóstico ni sustituye a un médico, dietista o entrenador.

## Estructura

```
index.html             La app completa: HTML, CSS y JavaScript
manifest.webmanifest   Nombre e iconos para instalarla
sw.js                  Copia local para que funcione sin conexión
icons/                 Iconos de la app y favicon
brand/                 Logo en todas sus variantes (horizontal, compacto, símbolo, icono; claro, oscuro, monocromo)
img/                   Imágenes del día (generadas por ordenador en 3D, sin derechos de terceros)
```

No hay que compilar nada. Para probarla en tu ordenador, ejecuta `python3 -m http.server` en esta carpeta y abre `http://localhost:8000`.
