'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const TERMS_HTML = `
<h3 class="font-semibold text-sm mb-2">1. Objeto del Servicio</h3>
<p class="mb-3 text-sm text-gray-600">
  YOYO GRAPHICS, S.A. (en adelante "misello.gt") es una empresa dedicada a la fabricación de sellos de hule personalizados bajo pedido. 
  El cliente utiliza nuestra plataforma para diseñar y ordenar sellos con el texto, tipografía, logotipos y especificaciones que él mismo proporciona.
</p>

<h3 class="font-semibold text-sm mb-2">2. Responsabilidad del Contenido</h3>
<p class="mb-3 text-sm text-gray-600">
  El cliente es el único responsable del contenido que imprime en su sello: textos, nombres, logotipos, marcas, firmas y cualquier otro elemento gráfico. 
  misello.gt <strong>no revisa, verifica ni valida</strong> si el contenido infringe derechos de autor, marcas registradas, secretos comerciales o normativas aplicables. 
  El cliente declara bajo su propia responsabilidad que cuenta con los derechos legales necesarios para reproducir dicho contenido.
</p>

<h3 class="font-semibold text-sm mb-2">3. Deslinde por Mal Uso del Producto</h3>
<p class="mb-3 text-sm text-gray-600">
  misello.gt actúa únicamente como fabricante del bien tangible (sello de hule). 
  <strong>No tenemos conocimiento ni control sobre el uso final</strong> que el cliente o terceros darán al producto. 
  Por lo tanto, misello.gt queda expresamente deslindada de cualquier responsabilidad civil, penal, administrativa o de cualquier otra índole derivada del mal uso, uso indebido, falsificación, suplantación de identidad, fraude o cualquier actividad ilícita que se realice con el sello una vez entregado. 
  El cliente asume enteramente las consecuencias legales de sus actos.
</p>

<h3 class="font-semibold text-sm mb-2">4. Envíos y Tiempos de Entrega</h3>
<p class="mb-3 text-sm text-gray-600">
  misello.gt entrega el producto terminado a una empresa de transporte y mensajería de terceros. 
  A partir de ese momento, la responsabilidad del traslado, cuidado y entrega en destino recae exclusivamente sobre la empresa transportadora. 
  misello.gt proporcionará al cliente el número de guía de envío por correo electrónico para su seguimiento. 
  <strong>No garantizamos tiempos de entrega específicos</strong> ni nos hacemos responsables por retrasos, pérdidas, daños o extravíos ocasionados durante el transporte, ya que estos factores dependen directamente de la empresa transportadora y de circunstancias ajenas a nuestro control (clima, tráfico, aduanas, etc.).
</p>

<h3 class="font-semibold text-sm mb-2">5. Propiedad Intelectual y Logotipos de Terceros</h3>
<p class="mb-3 text-sm text-gray-600">
  Si el cliente solicita la inclusión de logotipos, marcas, emblemas, escudos o cualquier símbolo que sea propiedad de un tercero, 
  el cliente declara que está autorizado para su reproducción o que dicho material es de dominio público. 
  misello.gt <strong>no investiga ni certifica</strong> la titularidad de derechos de propiedad intelectual sobre los archivos que el cliente sube. 
  Cualquier reclamo por infracción de copyright o marca registrada deberá ser dirimido directamente entre el cliente y el titular de los derechos afectados, 
  sin responsabilidad alguna para misello.gt.
</p>

<h3 class="font-semibold text-sm mb-2">6. Aceptación de Términos</h3>
<p class="mb-3 text-sm text-gray-600">
  Al realizar un pedido a través de misello.gt, el cliente declara haber leído, comprendido y aceptado íntegramente estos Términos y Condiciones. 
  Si no está de acuerdo con alguno de ellos, deberá abstenerse de utilizar nuestros servicios.
</p>
`;

export function TermsAccordion() {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-sm text-gray-800">
          Términos y condiciones de compra
        </span>
        <ChevronDown
          className={`h-5 w-5 text-gray-400 shrink-0 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Animación suave con grid-template-rows */}
      <div
        className="grid transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{
          gridTemplateRows: open ? '1fr' : '0fr',
        }}
      >
        <div className="min-h-0">
          <div
            className="px-5 pb-5 pt-1 text-gray-700 overflow-y-auto"
            style={{ maxHeight: '400px' }}
            dangerouslySetInnerHTML={{ __html: TERMS_HTML }}
          />
        </div>
      </div>
    </div>
  );
}
