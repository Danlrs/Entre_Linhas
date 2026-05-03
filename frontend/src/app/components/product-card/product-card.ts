import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../../../../shared/interfaces/products/product.interface';
import { Router } from '@angular/router';

const PLACEHOLDER = 'https://via.placeholder.com/400x400?text=Produto';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css',
})
export class ProductCard {
  @Input() product!: Product;
  @Input() isAdmin = false;
  @Output() edit = new EventEmitter<Product>();
  @Output() delete = new EventEmitter<number>();

  showDeleteModal = false;

  constructor(private router: Router) {}

  get imageUrl(): string {
    const principal =
      (this.product.imagens ?? []).find((img) => img.principal) ??
      (this.product.imagens ?? [])[0];
    if (principal?.url) return principal.url;
    return this.resolveLegacyImage(this.product.image);
  }

  private toNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') return 0;
    const n = typeof value === 'number' ? value : parseFloat(String(value));
    return Number.isFinite(n) ? n : 0;
  }

  get displayPrice(): number {
    const tamanhos = (this.product.tamanhos ?? []).filter((t) => t.ativo !== false);
    if (tamanhos.length > 0) {
      return Math.min(...tamanhos.map((t) => this.toNumber(t.preco)));
    }
    return this.toNumber(this.product.price);
  }

  get hasVariations(): boolean {
    return (this.product.tamanhos ?? []).filter((t) => t.ativo !== false).length > 0;
  }

  get priceLabel(): string {
    return this.displayPrice.toFixed(2).replace('.', ',');
  }

  private resolveLegacyImage(image?: string | null): string {
    if (!image) return PLACEHOLDER;
    if (/^(https?:)?\/\//.test(image) || image.startsWith('/')) return image;
    return `/assets/${image}`;
  }

  onView(): void {
    this.router.navigate(['/product', this.product.id]);
  }

  onEdit(): void {
    this.edit.emit(this.product);
  }

  onDelete(): void {
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    this.showDeleteModal = false;
    this.delete.emit(this.product.id);
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
  }
}
