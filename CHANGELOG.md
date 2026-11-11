# Changelog

Todos los cambios notables de este proyecto se documentarán en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y este proyecto sigue [Semantic Versioning](https://semver.org/lang/es/).

## [v0.2.1] - 2026-11-11

### Changed
- Sombra tipográfica (`text-shadow: 1px 1px 2px #8f8f8f`) en el `<h1>` principal de `app/components/TopHalf.vue` cuando no hay carácter resaltado en recuadro (`activeCharIndex === null`) para mejorar la legibilidad del hanzi sobre fondo blanco.

## [v0.2.0] - 2026-11-11

### Added
- Componente reutilizable `app/components/CardEditModal.vue` extraído desde el diccionario para editar tarjetas (básicos, fonética, Hanban y SRS).
- Botón de ajustes rápido junto a `Terminar` en `app/pages/index.vue` (`openQuickEdit` / `handleQuickEditSave`) para editar la tarjeta en curso, sincronizar `activeDeck` al instante y reiniciar la tarjeta a la fase `DEFINITION`.
- Componente `app/components/ToneIcon.vue` para compartir los trazos SVG de los 5 tonos entre las fases `TONE` y `PINYIN`.
- Propiedad `badgeBgHex` en `TONE_STYLES` (`app/constants/tones.ts`) con fondos oscurecidos de alto contraste por tono (`#B8470B`, `#367646`, `#C12727`, `#1D5F8C`, `#6E7278`).

### Changed
- Resaltado del carácter activo en `app/components/TopHalf.vue` sin color naranja en fase `TONE` (tarjeta invertida neutra `bg-slate-900 text-white`) y usando el fondo oscurecido del tono (`activeCharTone` → `badgeBgHex`) durante la fase `PINYIN`.
- Incremento de `+2 px` en `definitionFontSizeClass` (`20/22 px`, `18/20 px`, `16/18 px`) y altura fija `h-16` en `app/components/TopHalf.vue` para destacar la traducción revelada.
- Coloración completa y recordatorio SVG flotante (`ToneIcon` posicionado con `absolute bottom-full`) en todas las opciones de la fase `PINYIN` dentro de `app/components/BottomHalf.vue` sin desplazar verticalmente las sílabas.
- Refactorización de `app/components/CharacterList.vue` para consumir `CardEditModal.vue` evitando duplicación de formulario.

## [v0.1.0] - 2026-11-11

### Added
- Prop opcional `showDefinition` (por defecto `false`) y tamaño tipográfico adaptable (`definitionFontSizeClass`) en `app/components/TopHalf.vue` para mostrar el significado correcto debajo de los caracteres chinos.
- Contenedor permanente sin bordes con altura fija (`h-14`) y fondo blanco en `app/components/TopHalf.vue` para revelar la definición sin provocar *layout shift* (redrawing visual).

### Changed
- Conexión de `:showDefinition="phase !== 'DEFINITION'"` en `app/pages/index.vue` para mostrar el significado únicamente después de concluir los `600 ms` de transición tras acertar el significado, manteniéndolo visible en las fases `TONE` y `PINYIN`.
- Ajuste de espaciado (`mb-3` en `<h1>` y `pb-10` en la mitad superior) en `app/components/TopHalf.vue` para conservar margen visual respecto al indicador de instrucción.
