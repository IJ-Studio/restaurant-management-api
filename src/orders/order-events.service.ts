import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

/** Qué le pasó al pedido. El cliente decide qué volver a pedir al API. */
export type OrderChange = 'items' | 'sent' | 'status' | 'cancelled' | 'charged';

export interface OrderEvent {
  change: OrderChange;
  orderId: string;
  /** Estatus nuevo cuando el cambio lo conoce (p. ej. `lista`). */
  estatus?: string;
  at: string;
}

/**
 * Bus de eventos de pedidos para el tiempo real (HU-06). Solo lleva el id y el tipo de cambio:
 * los datos del pedido se siguen pidiendo por las rutas normales, con sus permisos.
 */
// shortcut: bus en memoria, válido con una sola instancia del API; con más de una, pasar a LISTEN/NOTIFY de Postgres o Redis.
@Injectable()
export class OrderEventsService {
  private readonly events = new Subject<OrderEvent>();

  emit(change: OrderChange, orderId: string, estatus?: string): void {
    this.events.next({
      change,
      orderId,
      ...(estatus ? { estatus } : {}),
      at: new Date().toISOString(),
    });
  }

  /** Eventos desde ahora: quien se conecta no recibe los anteriores. */
  stream(): Observable<OrderEvent> {
    return this.events.asObservable();
  }
}
