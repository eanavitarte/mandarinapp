# Changelog

Todos los cambios notables de este proyecto se documentarán en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y este proyecto sigue [Semantic Versioning](https://semver.org/lang/es/).

## [v0.1.0] - 2026-11-11

### Added
- Prop opcional `showDefinition` (por defecto `false`) y tamaño tipográfico adaptable (`definitionFontSizeClass`) en `app/components/TopHalf.vue` para mostrar el significado correcto debajo de los caracteres chinos.
- Contenedor permanente sin bordes con altura fija (`h-14`) y fondo blanco en `app/components/TopHalf.vue` para revelar la definición sin provocar *layout shift* (redrawing visual).

### Changed
- Conexión de `:showDefinition="phase !== 'DEFINITION'"` en `app/pages/index.vue` para mostrar el significado únicamente después de concluir los `600 ms` de transición tras acertar el significado, manteniéndolo visible en las fases `TONE` y `PINYIN`.
- Ajuste de espaciado (`mb-3` en `<h1>` y `pb-10` en la mitad superior) en `app/components/TopHalf.vue` para conservar margen visual respecto al indicador de instrucción.
