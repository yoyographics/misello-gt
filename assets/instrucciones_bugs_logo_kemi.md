# Corrección de Bugs — Logo no aparece en previsualización
**Para:** Kemi  
**Proyecto:** misello.gt  
**Fecha:** 21 de mayo de 2026  
**Prioridad:** Alta — bloquea checkout del cliente

---

## Resumen del problema

Cuando el cliente sube un logo, la previsualización del sello no lo muestra. Se identificaron **3 bugs simultáneos**. Deben corregirse en el orden indicado.

---

## Bug 1 — La ruta relativa no funciona dentro del SVG (CRÍTICO)
**Archivo:** `design.controller.ts`

### Por qué falla
El método `uploadLogo` devuelve `/uploads/logos/abc.png`. Esa ruta es relativa al servidor. Cuando el SVG se empaqueta como `data:image/svg+xml;base64,...`, el navegador no puede resolver rutas relativas desde adentro de una cadena de texto. El logo simplemente no carga.

### Qué cambiar

**Buscar este código (líneas 34–38):**
```typescript
@UseInterceptors(FileInterceptor('logo', { dest: 'uploads/logos' }))
uploadLogo(@UploadedFile() file: Express.Multer.File) {
  return { logoUrl: `/uploads/logos/${file.filename}` };
}
```

**Reemplazarlo por:**
```typescript
@UseInterceptors(FileInterceptor('logo'))
uploadLogo(@UploadedFile() file: Express.Multer.File) {
  const base64 = file.buffer.toString('base64');
  const mimeType = file.mimetype;
  const logoDataUri = `data:${mimeType};base64,${base64}`;
  return { logoUrl: logoDataUri };
}
```

### Por qué funciona
El logo ahora viaja como data URI completo (`data:image/png;base64,...`). El SVG puede embeber eso directamente sin depender de ninguna ruta del servidor.

---

## Bug 2 — `getDefaultDesign()` pierde el logo cuando Claude falla
**Archivo:** `claude-design.service.ts`

### Por qué falla
Cuando Claude no responde o no hay `ANTHROPIC_API_KEY`, el sistema usa `getDefaultDesign()` como fallback. Ese método nunca incluye la propiedad `logo` en el objeto que retorna. Entonces `params.logo` llega `undefined` al renderer y la condición `if (logoUrl && params.logo)` nunca se cumple — el logo desaparece aunque esté subido.

### Qué cambiar

**Paso 1 — Cambiar la firma del método.**

Buscar:
```typescript
private getDefaultDesign(
  lines: Array<{ text: string; fontSize?: string; isBold?: boolean; isItalic?: boolean; alignment?: string }>,
  product: { widthPx: number; heightPx: number; shape: string },
): DesignParameters {
```

Reemplazar por:
```typescript
private getDefaultDesign(
  lines: Array<{ text: string; fontSize?: string; isBold?: boolean; isItalic?: boolean; alignment?: string }>,
  product: { widthPx: number; heightPx: number; shape: string },
  logoUrl?: string,
): DesignParameters {
```

**Paso 2 — Agregar el campo `logo` en el return del método.**

Buscar el `return` final del método `getDefaultDesign` que dice:
```typescript
return {
  layout: product.shape === 'CIRCULAR' ? 'circular' : lines.length === 1 ? 'single-line' : 'multi-line',
  textLines,
  margins: { top: margin, right: margin, bottom: margin, left: margin },
  spacing: 10,
};
```

Reemplazar por:
```typescript
return {
  layout: product.shape === 'CIRCULAR' ? 'circular' : lines.length === 1 ? 'single-line' : 'multi-line',
  textLines,
  ...(logoUrl ? {
    logo: {
      x: 10,
      y: 10,
      width: 80,
      height: 80,
      grayscale: true,
    }
  } : {}),
  margins: { top: margin, right: margin, bottom: margin, left: margin },
  spacing: 10,
};
```

**Paso 3 — Pasar `logoUrl` en las dos llamadas a `getDefaultDesign`.**

Hay dos lugares donde se llama ese método. Buscar ambas y actualizarlas:

```typescript
// Antes (las dos instancias dicen esto):
return this.getDefaultDesign(lines, product);

// Después (ambas deben quedar así):
return this.getDefaultDesign(lines, product, logoUrl);
```

Las dos instancias están en:
- El bloque `if (!this.anthropic)` al inicio de `generateDesign`
- El bloque `catch` al final de `generateDesign`

---

## Bug 3 — Typo en el height del logo en el preview
**Archivo:** `svg-renderer.service.ts`, línea ~287

### Por qué falla
En el SVG de preview, el `height` del elemento `<image>` del logo recibe `logoUrl` en lugar de `params.logo.height`. Eso produce un atributo inválido que hace que el logo aparezca con altura 0 o no renderice.

### Qué cambiar

**Buscar en `buildPreviewSvg`:**
```typescript
logoElement = `    <image x="${params.logo.x}" y="${params.logo.y}" width="${params.logo.width}" height="${logoUrl}" href="${logoUrl}" />`;
```

**Reemplazar por:**
```typescript
logoElement = `    <image x="${params.logo.x}" y="${params.logo.y}" width="${params.logo.width}" height="${params.logo.height}" href="${logoUrl}" />`;
```

---

## Orden de ejecución

| # | Bug | Archivo | Tiempo estimado |
|---|-----|---------|-----------------|
| 1 | Ruta relativa → data URI | `design.controller.ts` | 5 min |
| 2 | Typo en height | `svg-renderer.service.ts` | 1 min |
| 3 | Fallback pierde logo | `claude-design.service.ts` | 10 min |

---

## Verificación después del deploy

1. Subir un logo PNG desde el flujo del cliente en producción
2. Avanzar al paso de previsualización
3. Confirmar que el logo aparece dentro del diseño del sello
4. Probar también desconectando la `ANTHROPIC_API_KEY` temporalmente para verificar que el fallback también muestra el logo

---

*Generado con Claude (Anthropic) — claude-sonnet-4-6*  
*Fecha: 21 de mayo de 2026*
