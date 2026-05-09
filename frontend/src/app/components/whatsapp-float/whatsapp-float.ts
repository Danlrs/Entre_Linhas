import { Component, computed, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';

/** Botão flutuante WhatsApp: arraste para encostar à direita; arraste para a esquerda ou toque na abinha para voltar. */
@Component({
  selector: 'app-whatsapp-float',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './whatsapp-float.html',
  styleUrl: './whatsapp-float.css',
})
export class WhatsAppFloatComponent {
  readonly fabPx = 56;
  readonly peekPx = 18;
  readonly dockTranslateX = this.fabPx - this.peekPx;

  readonly whatsappHref = computed(() => {
    const phone = environment.whatsappPhoneE164;
    const text = environment.whatsappDefaultMessage ?? '';
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  });

  offsetX = signal(0);
  offsetY = signal(0);
  docked = signal(false);
  dragging = signal(false);

  displayX = computed(() => (this.docked() ? this.dockTranslateX : this.offsetX()));

  private dragMoved = false;
  private dragStart = { px: 0, py: 0, ox: 0, oy: 0 };
  private pointerId: number | null = null;
  private captureEl: HTMLElement | null = null;

  private readonly maxOffsetX = 120;
  private readonly maxOffsetYUp = 280;
  private readonly maxOffsetYDown = 40;
  private readonly dockTriggerPx = 36;

  private clampX(v: number): number {
    return Math.max(-this.maxOffsetX, Math.min(this.maxOffsetX + this.dockTranslateX, v));
  }

  private clampY(v: number): number {
    return Math.max(-this.maxOffsetYUp, Math.min(this.maxOffsetYDown, v));
  }

  onPointerDown(ev: PointerEvent): void {
    ev.preventDefault();
    const target = ev.currentTarget as HTMLElement;
    target.setPointerCapture(ev.pointerId);
    this.captureEl = target;
    this.pointerId = ev.pointerId;
    this.dragging.set(true);
    this.dragMoved = false;
    this.dragStart = {
      px: ev.clientX,
      py: ev.clientY,
      ox: this.offsetX(),
      oy: this.offsetY(),
    };
  }

  @HostListener('document:pointermove', ['$event'])
  onDocumentPointerMove(ev: PointerEvent): void {
    if (!this.dragging() || ev.pointerId !== this.pointerId) return;

    const dx = ev.clientX - this.dragStart.px;
    const dy = ev.clientY - this.dragStart.py;
    if (Math.abs(dx) + Math.abs(dy) > 5) this.dragMoved = true;

    if (this.docked()) {
      if (dx < -12) {
        this.docked.set(false);
        const nx = this.clampX(this.dockTranslateX + dx);
        const ny = this.clampY(this.dragStart.oy + dy);
        this.offsetX.set(nx);
        this.offsetY.set(ny);
        this.dragStart = { px: ev.clientX, py: ev.clientY, ox: nx, oy: ny };
      }
      return;
    }

    const nx = this.clampX(this.dragStart.ox + dx);
    const ny = this.clampY(this.dragStart.oy + dy);
    this.offsetX.set(nx);
    this.offsetY.set(ny);
  }

  @HostListener('document:pointerup', ['$event'])
  @HostListener('document:pointercancel', ['$event'])
  onDocumentPointerUp(ev: PointerEvent): void {
    if (!this.dragging() || ev.pointerId !== this.pointerId) return;

    try {
      this.captureEl?.releasePointerCapture(ev.pointerId);
    } catch {
      // ignore
    }
    this.captureEl = null;
    this.dragging.set(false);
    this.pointerId = null;

    if (this.docked()) {
      if (!this.dragMoved) {
        this.docked.set(false);
        this.offsetX.set(0);
        this.offsetY.set(0);
      }
      this.dragMoved = false;
      return;
    }

    const ox = this.offsetX();
    if (ox >= this.dockTriggerPx) {
      this.docked.set(true);
      this.offsetX.set(this.dockTranslateX);
    }

    this.dragMoved = false;
  }

  onLinkClick(ev: MouseEvent): void {
    if (this.dragMoved) {
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }
    if (this.docked()) {
      ev.preventDefault();
      ev.stopPropagation();
      this.docked.set(false);
      this.offsetX.set(0);
      this.offsetY.set(0);
    }
  }
}
