import { Injectable, Logger } from '@nestjs/common';

export interface CorreoFactura {
  para: string;
  nombre: string;
  folio: string;
  /** PDF de la factura en base64 (Brevo lo manda como adjunto). */
  pdfBase64?: string;
  xmlBase64?: string;
}

export interface ResultadoCorreo {
  enviado: boolean;
  motivo?: string;
}

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Envío de correos con Brevo (Fase 4.1). **Preparado y apagado:** solo envía si `CORREO_ACTIVO=true`
 * y existen `BREVO_API_KEY` y `CORREO_REMITENTE`. Nunca lanza: un correo que falla no deshace la
 * factura ya emitida.
 */
@Injectable()
export class CorreoService {
  private readonly logger = new Logger(CorreoService.name);

  activo(): boolean {
    return (
      process.env.CORREO_ACTIVO === 'true' &&
      !!process.env.BREVO_API_KEY &&
      !!process.env.CORREO_REMITENTE
    );
  }

  async enviarFactura(datos: CorreoFactura): Promise<ResultadoCorreo> {
    if (!this.activo())
      return {
        enviado: false,
        motivo: 'El envío por correo está desactivado.',
      };
    const adjuntos = [
      datos.pdfBase64 && {
        name: `factura-${datos.folio}.pdf`,
        content: datos.pdfBase64,
      },
      datos.xmlBase64 && {
        name: `factura-${datos.folio}.xml`,
        content: datos.xmlBase64,
      },
    ].filter(Boolean);
    try {
      const respuesta = await fetch(BREVO_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.BREVO_API_KEY as string,
        },
        body: JSON.stringify({
          sender: {
            email: process.env.CORREO_REMITENTE,
            name: 'Restaurante El Quijote',
          },
          to: [{ email: datos.para, name: datos.nombre }],
          subject: `Tu factura ${datos.folio} de El Quijote`,
          htmlContent: `<p>Hola ${escaparHtml(datos.nombre)}:</p><p>Adjuntamos tu factura ${escaparHtml(datos.folio)}. Gracias por tu visita.</p>`,
          ...(adjuntos.length ? { attachment: adjuntos } : {}),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!respuesta.ok) {
        this.logger.error(`Brevo respondió ${String(respuesta.status)}`);
        return {
          enviado: false,
          motivo: 'El servicio de correo no aceptó el envío.',
        };
      }
      return { enviado: true };
    } catch (error) {
      this.logger.error(
        `No se pudo enviar el correo: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        enviado: false,
        motivo: 'No se pudo conectar con el servicio de correo.',
      };
    }
  }
}

const escaparHtml = (texto: string) =>
  texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
