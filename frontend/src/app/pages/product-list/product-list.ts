import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ProductService } from '../../services/product.service';
import {
  Product,
  ProductSaveEvent,
} from '../../../../../shared/interfaces/products/product.interface';
import { Categoria } from '../../../../../shared/interfaces/products/categoria.interface';
import { Estampa } from '../../../../../shared/interfaces/products/estampa.interface';
import { Material } from '../../../../../shared/interfaces/products/material.interface';
import { ProductCard } from '../../components/product-card/product-card';
import { ProductFormModal } from '../../components/product-form-modal/product-form-modal';
import { AuthService } from '../../services/auth.service';
import { CategoriaService } from '../../services/categoria.service';
import { EstampaService } from '../../services/estampa.service';
import { MaterialService } from '../../services/material.service';

type SortOption = 'recent' | 'priceAsc' | 'priceDesc' | 'name';

@Component({
  selector: 'app-product-list',
  imports: [CommonModule, FormsModule, ProductCard, ProductFormModal],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductList implements OnInit {
  products: Product[] = [];
  isLoading = false;
  showForm = false;
  editingProduct: Product | null = null;

  categorias: Categoria[] = [];
  estampas: Estampa[] = [];
  materiais: Material[] = [];

  searchTerm = '';
  selectedCategoriaId: number | null = null;
  selectedEstampaIds = new Set<number>();
  selectedMaterialIds = new Set<number>();
  priceMin: number | null = null;
  priceMax: number | null = null;
  sortBy: SortOption = 'recent';

  showOnlyAvailable = false;
  isFilterDrawerOpen = false;

  constructor(
    private productService: ProductService,
    private categoriaService: CategoriaService,
    private estampaService: EstampaService,
    private materialService: MaterialService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    public authService: AuthService,
  ) {}

  get isLoggedIn() {
    return this.authService.isAuthenticated();
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const cat = params.get('categoria');
      this.selectedCategoriaId = cat ? +cat : null;
      this.cdr.detectChanges();
    });
    this.loadProducts();
    this.loadFilterOptions();
  }

  loadProducts(): void {
    this.isLoading = true;
    this.productService.getAllProducts().subscribe({
      next: (products) => {
        this.products = products;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Erro ao buscar produtos', error);
        this.isLoading = false;
        this.products = [];
      },
    });
  }

  private loadFilterOptions(): void {
    this.categoriaService.getAll().subscribe({
      next: (data) => {
        this.categorias = data;
        this.cdr.detectChanges();
      },
      error: () => (this.categorias = []),
    });
    this.estampaService.getAll().subscribe({
      next: (data) => {
        this.estampas = data;
        this.cdr.detectChanges();
      },
      error: () => (this.estampas = []),
    });
    this.materialService.getAll().subscribe({
      next: (data) => {
        this.materiais = data;
        this.cdr.detectChanges();
      },
      error: () => (this.materiais = []),
    });
  }

  // ============ FILTER STATE ============

  toggleEstampa(id: number): void {
    if (this.selectedEstampaIds.has(id)) this.selectedEstampaIds.delete(id);
    else this.selectedEstampaIds.add(id);
  }

  toggleMaterial(id: number): void {
    if (this.selectedMaterialIds.has(id)) this.selectedMaterialIds.delete(id);
    else this.selectedMaterialIds.add(id);
  }

  selectCategoria(id: number | null): void {
    this.selectedCategoriaId = this.selectedCategoriaId === id ? null : id;
  }

  clearAllFilters(): void {
    this.searchTerm = '';
    this.selectedCategoriaId = null;
    this.selectedEstampaIds.clear();
    this.selectedMaterialIds.clear();
    this.priceMin = null;
    this.priceMax = null;
    this.showOnlyAvailable = false;
  }

  removeCategoria(): void {
    this.selectedCategoriaId = null;
  }

  removeEstampa(id: number): void {
    this.selectedEstampaIds.delete(id);
  }

  removeMaterial(id: number): void {
    this.selectedMaterialIds.delete(id);
  }

  removeSearch(): void {
    this.searchTerm = '';
  }

  removePriceRange(): void {
    this.priceMin = null;
    this.priceMax = null;
  }

  get hasActiveFilters(): boolean {
    return (
      !!this.searchTerm.trim() ||
      this.selectedCategoriaId !== null ||
      this.selectedEstampaIds.size > 0 ||
      this.selectedMaterialIds.size > 0 ||
      this.priceMin !== null ||
      this.priceMax !== null ||
      this.showOnlyAvailable
    );
  }

  get activeFiltersCount(): number {
    let n = 0;
    if (this.searchTerm.trim()) n++;
    if (this.selectedCategoriaId !== null) n++;
    n += this.selectedEstampaIds.size;
    n += this.selectedMaterialIds.size;
    if (this.priceMin !== null || this.priceMax !== null) n++;
    if (this.showOnlyAvailable) n++;
    return n;
  }

  // ============ DERIVED LISTS ============

  get filteredProducts(): Product[] {
    const search = this.searchTerm.trim().toLowerCase();
    const min = this.priceMin ?? -Infinity;
    const max = this.priceMax ?? Infinity;

    const result = this.products.filter((product) => {
      if (this.showOnlyAvailable && !product.available) return false;

      if (search) {
        const haystack = [product.name, product.descricao ?? '', product.categoria?.nome ?? '']
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }

      if (this.selectedCategoriaId !== null) {
        const productCategoriaId = product.categoriaId ?? product.categoria?.id ?? null;
        if (productCategoriaId !== this.selectedCategoriaId) return false;
      }

      const price = this.productEffectivePrice(product);
      if (price < min || price > max) return false;

      if (this.selectedEstampaIds.size > 0) {
        const productEstampaIds = (product.estampas ?? []).map((e) => e.id);
        const matches = productEstampaIds.some((id) => this.selectedEstampaIds.has(id));
        if (!matches) return false;
      }

      if (this.selectedMaterialIds.size > 0) {
        const productMaterialIds = (product.materiais ?? []).map((m) => m.id);
        const matches = productMaterialIds.some((id) => this.selectedMaterialIds.has(id));
        if (!matches) return false;
      }

      return true;
    });

    return this.sortProducts(result);
  }

  private sortProducts(list: Product[]): Product[] {
    const sorted = [...list];
    switch (this.sortBy) {
      case 'priceAsc':
        sorted.sort((a, b) => this.productEffectivePrice(a) - this.productEffectivePrice(b));
        break;
      case 'priceDesc':
        sorted.sort((a, b) => this.productEffectivePrice(b) - this.productEffectivePrice(a));
        break;
      case 'name':
        sorted.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
        break;
      case 'recent':
      default:
        sorted.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
    }
    return sorted;
  }

  private normalizePrice(value: number | string | null | undefined): number {
    if (value === null || value === undefined || value === '') return 0;
    const n = typeof value === 'number' ? value : parseFloat(String(value));
    return Number.isFinite(n) ? n : 0;
  }

  private productEffectivePrice(product: Product): number {
    const tamanhos = (product.tamanhos ?? []).filter((t) => t.ativo !== false);
    if (tamanhos.length > 0) {
      return Math.min(...tamanhos.map((t) => this.normalizePrice(t.preco)));
    }
    return this.normalizePrice(product.price);
  }

  getCategoriaName(id: number | null): string {
    if (id === null) return '';
    return this.categorias.find((c) => c.id === id)?.nome ?? '';
  }

  getEstampaName(id: number): string {
    return this.estampas.find((e) => e.id === id)?.nome ?? '';
  }

  getMaterialName(id: number): string {
    return this.materiais.find((m) => m.id === id)?.nome ?? '';
  }

  // ============ CRUD ============

  deleteProduct(id: number): void {
    this.productService.deleteProduct(id).subscribe({
      next: () => {
        this.products = this.products.filter((product) => product.id !== id);
        this.cdr.detectChanges();
      },
      error: (error) => console.error('Erro ao remover produto', error),
    });
  }

  onCreateProduct(): void {
    this.editingProduct = null;
    this.showForm = true;
  }

  onEditProduct(product?: Product): void {
    this.editingProduct = product ?? null;
    this.showForm = true;
    this.cdr.detectChanges();
  }

  onCloseForm(): void {
    this.showForm = false;
    this.editingProduct = null;
  }

  onSaveProduct(event: ProductSaveEvent): void {
    const { editingId, payload } = event;

    if (editingId !== null && editingId !== undefined) {
      this.productService.updateProduct(editingId, payload).subscribe({
        next: (updated) => {
          this.products = this.products.map((p) => (p.id === updated.id ? updated : p));
          this.onCloseForm();
          this.cdr.detectChanges();
        },
        error: (error) => console.error('Erro ao atualizar o produto', error),
      });
    } else {
      this.productService.createProduct(payload).subscribe({
        next: (newProduct) => {
          this.products = [...this.products, newProduct];
          this.onCloseForm();
          this.cdr.detectChanges();
        },
        error: (error) => console.error('Erro ao criar produto', error),
      });
    }
  }
}
