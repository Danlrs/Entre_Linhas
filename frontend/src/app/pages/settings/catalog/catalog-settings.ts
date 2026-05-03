import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import {
  Product,
  ProductSaveEvent,
} from '../../../../../../shared/interfaces/products/product.interface';
import { Categoria } from '../../../../../../shared/interfaces/products/categoria.interface';
import { Estampa } from '../../../../../../shared/interfaces/products/estampa.interface';
import { Material } from '../../../../../../shared/interfaces/products/material.interface';
import { ProductService } from '../../../services/product.service';
import { CategoriaService } from '../../../services/categoria.service';
import { EstampaService } from '../../../services/estampa.service';
import { MaterialService } from '../../../services/material.service';
import { UploadService } from '../../../services/upload.service';
import { ProductFormModal } from '../../../components/product-form-modal/product-form-modal';

type CatalogTab = 'produtos' | 'categorias' | 'materiais' | 'estampas';

interface ConfirmAction {
  message: string;
  onConfirm: () => void;
}

@Component({
  selector: 'app-catalog-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductFormModal],
  templateUrl: './catalog-settings.html',
  styleUrl: './catalog-settings.css',
})
export class CatalogSettings implements OnInit {
  activeTab: CatalogTab = 'produtos';

  products: Product[] = [];
  categorias: Categoria[] = [];
  materiais: Material[] = [];
  estampas: Estampa[] = [];

  loading = {
    products: false,
    categorias: false,
    materiais: false,
    estampas: false,
  };

  searchProducts = '';

  showProductModal = false;
  editingProduct: Product | null = null;

  newCategoriaNome = '';
  creatingCategoria = false;

  newMaterialNome = '';
  newMaterialTipo = '';
  newMaterialFile: File | null = null;
  newMaterialPreview = '';
  creatingMaterial = false;

  newEstampaNome = '';
  newEstampaValorAdicional: number | null = null;
  newEstampaFile: File | null = null;
  newEstampaPreview = '';
  creatingEstampa = false;

  errorMessage = '';
  successMessage = '';

  confirmAction: ConfirmAction | null = null;

  tabs: { id: CatalogTab; label: string; icon: 'box' | 'tag' | 'fabric' | 'pattern' }[] = [
    { id: 'produtos', label: 'Produtos', icon: 'box' },
    { id: 'categorias', label: 'Categorias', icon: 'tag' },
    { id: 'materiais', label: 'Materiais', icon: 'fabric' },
    { id: 'estampas', label: 'Estampas', icon: 'pattern' },
  ];

  constructor(
    private productService: ProductService,
    private categoriaService: CategoriaService,
    private estampaService: EstampaService,
    private materialService: MaterialService,
    private uploadService: UploadService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  setTab(tab: CatalogTab): void {
    this.activeTab = tab;
    this.errorMessage = '';
    this.successMessage = '';
  }

  private loadAll(): void {
    this.loadProducts();
    this.loadCategorias();
    this.loadMateriais();
    this.loadEstampas();
  }

  private loadProducts(): void {
    this.loading.products = true;
    this.productService.getAllProducts().subscribe({
      next: (data) => {
        this.products = data;
        this.loading.products = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading.products = false;
        this.products = [];
      },
    });
  }

  private loadCategorias(): void {
    this.loading.categorias = true;
    this.categoriaService.getAll().subscribe({
      next: (data) => {
        this.categorias = [...data].sort((a, b) => a.nome.localeCompare(b.nome));
        this.loading.categorias = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading.categorias = false;
        this.categorias = [];
      },
    });
  }

  private loadMateriais(): void {
    this.loading.materiais = true;
    this.materialService.getAll().subscribe({
      next: (data) => {
        this.materiais = [...data].sort((a, b) => a.nome.localeCompare(b.nome));
        this.loading.materiais = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading.materiais = false;
        this.materiais = [];
      },
    });
  }

  private loadEstampas(): void {
    this.loading.estampas = true;
    this.estampaService.getAll().subscribe({
      next: (data) => {
        this.estampas = [...data].sort((a, b) => a.nome.localeCompare(b.nome));
        this.loading.estampas = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading.estampas = false;
        this.estampas = [];
      },
    });
  }

  // ============ PRODUTOS ============

  get filteredProducts(): Product[] {
    const q = this.searchProducts.trim().toLowerCase();
    if (!q) return this.products;
    return this.products.filter((p) => {
      const haystack = [p.name, p.descricao ?? '', p.categoria?.nome ?? ''].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }

  productImageUrl(product: Product): string {
    const principal =
      (product.imagens ?? []).find((img) => img.principal) ?? (product.imagens ?? [])[0];
    if (principal?.url) return principal.url;
    if (product.image) {
      if (/^(https?:)?\/\//.test(product.image) || product.image.startsWith('/')) return product.image;
      return `/assets/${product.image}`;
    }
    return '';
  }

  productPriceLabel(product: Product): string {
    const value =
      typeof product.price === 'number' ? product.price : parseFloat(String(product.price ?? 0));
    return `R$ ${(Number.isFinite(value) ? value : 0).toFixed(2).replace('.', ',')}`;
  }

  openCreateProduct(): void {
    this.editingProduct = null;
    this.showProductModal = true;
  }

  openEditProduct(product: Product): void {
    this.editingProduct = product;
    this.showProductModal = true;
    this.cdr.detectChanges();
  }

  closeProductModal(): void {
    this.showProductModal = false;
    this.editingProduct = null;
  }

  onProductSaved(event: ProductSaveEvent): void {
    const { editingId, payload } = event;

    if (editingId !== null && editingId !== undefined) {
      this.productService.updateProduct(editingId, payload).subscribe({
        next: (updated) => {
          this.products = this.products.map((p) => (p.id === updated.id ? updated : p));
          this.closeProductModal();
          this.flashSuccess('Produto atualizado.');
        },
        error: () => this.flashError('Erro ao atualizar o produto.'),
      });
    } else {
      this.productService.createProduct(payload).subscribe({
        next: (newProduct) => {
          this.products = [...this.products, newProduct];
          this.closeProductModal();
          this.flashSuccess('Produto criado.');
        },
        error: () => this.flashError('Erro ao criar o produto.'),
      });
    }
  }

  askDeleteProduct(product: Product): void {
    this.confirmAction = {
      message: `Tem certeza que deseja excluir o produto "${product.name}"? Essa ação não pode ser desfeita.`,
      onConfirm: () => this.deleteProduct(product),
    };
  }

  private deleteProduct(product: Product): void {
    this.productService.deleteProduct(product.id).subscribe({
      next: () => {
        this.products = this.products.filter((p) => p.id !== product.id);
        this.flashSuccess('Produto excluído.');
        this.cdr.detectChanges();
      },
      error: () => this.flashError('Erro ao excluir o produto.'),
    });
  }

  // ============ CATEGORIAS ============

  createCategoria(): void {
    const nome = this.newCategoriaNome.trim();
    if (!nome) return;
    this.creatingCategoria = true;
    this.categoriaService.create({ nome }).subscribe({
      next: (categoria) => {
        this.categorias = [...this.categorias, categoria].sort((a, b) =>
          a.nome.localeCompare(b.nome),
        );
        this.newCategoriaNome = '';
        this.creatingCategoria = false;
        this.flashSuccess('Categoria criada.');
        this.cdr.detectChanges();
      },
      error: () => {
        this.creatingCategoria = false;
        this.flashError('Erro ao criar a categoria.');
      },
    });
  }

  renameCategoria(categoria: Categoria, value: string): void {
    const nome = value.trim();
    if (!nome || nome === categoria.nome) return;
    this.categoriaService.update(categoria.id, { nome }).subscribe({
      next: (updated) => {
        this.categorias = this.categorias
          .map((c) => (c.id === updated.id ? updated : c))
          .sort((a, b) => a.nome.localeCompare(b.nome));
        this.flashSuccess('Categoria atualizada.');
      },
      error: () => this.flashError('Erro ao atualizar a categoria.'),
    });
  }

  askDeleteCategoria(categoria: Categoria): void {
    this.confirmAction = {
      message: `Excluir a categoria "${categoria.nome}"? Os produtos associados ficarão sem categoria.`,
      onConfirm: () => this.deleteCategoria(categoria),
    };
  }

  private deleteCategoria(categoria: Categoria): void {
    this.categoriaService.remove(categoria.id).subscribe({
      next: () => {
        this.categorias = this.categorias.filter((c) => c.id !== categoria.id);
        this.flashSuccess('Categoria removida.');
        this.cdr.detectChanges();
      },
      error: () => this.flashError('Erro ao remover a categoria.'),
    });
  }

  // ============ MATERIAIS ============

  onNewMaterialFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    this.clearNewMaterialImage();
    this.newMaterialFile = file;
    this.newMaterialPreview = URL.createObjectURL(file);
  }

  clearNewMaterialImage(): void {
    if (this.newMaterialPreview) URL.revokeObjectURL(this.newMaterialPreview);
    this.newMaterialPreview = '';
    this.newMaterialFile = null;
  }

  async createMaterial(): Promise<void> {
    const nome = this.newMaterialNome.trim();
    if (!nome) return;
    const tipo = this.newMaterialTipo.trim() || undefined;
    this.creatingMaterial = true;
    try {
      let imagemUrl: string | undefined;
      if (this.newMaterialFile) {
        const uploaded = await firstValueFrom(
          this.uploadService.uploadMaterialImage(this.newMaterialFile),
        );
        imagemUrl = uploaded.url;
      }
      const material = await firstValueFrom(
        this.materialService.create({
          nome,
          tipo,
          imagemUrl: imagemUrl ?? null,
        }),
      );
      this.materiais = [...this.materiais, material].sort((a, b) =>
        a.nome.localeCompare(b.nome),
      );
      this.newMaterialNome = '';
      this.newMaterialTipo = '';
      this.clearNewMaterialImage();
      this.flashSuccess('Material criado.');
      this.cdr.detectChanges();
    } catch {
      this.flashError('Erro ao criar o material.');
    } finally {
      this.creatingMaterial = false;
    }
  }

  askDeleteMaterial(material: Material): void {
    this.confirmAction = {
      message: `Excluir o material "${material.nome}"?`,
      onConfirm: () => this.deleteMaterial(material),
    };
  }

  private deleteMaterial(material: Material): void {
    this.materialService.remove(material.id).subscribe({
      next: () => {
        this.materiais = this.materiais.filter((m) => m.id !== material.id);
        this.flashSuccess('Material removido.');
        this.cdr.detectChanges();
      },
      error: () => this.flashError('Erro ao remover o material.'),
    });
  }

  // ============ ESTAMPAS ============

  onNewEstampaFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    this.clearNewEstampaImage();
    this.newEstampaFile = file;
    this.newEstampaPreview = URL.createObjectURL(file);
  }

  clearNewEstampaImage(): void {
    if (this.newEstampaPreview) URL.revokeObjectURL(this.newEstampaPreview);
    this.newEstampaPreview = '';
    this.newEstampaFile = null;
  }

  async createEstampa(): Promise<void> {
    const nome = this.newEstampaNome.trim();
    if (!nome) return;
    this.creatingEstampa = true;
    try {
      let imagemUrl: string | undefined;
      if (this.newEstampaFile) {
        const uploaded = await firstValueFrom(
          this.uploadService.uploadEstampaImage(this.newEstampaFile),
        );
        imagemUrl = uploaded.url;
      }
      const estampa = await firstValueFrom(
        this.estampaService.create({
          nome,
          imagemUrl: imagemUrl ?? null,
          valorAdicional: this.newEstampaValorAdicional ?? 0,
        }),
      );
      this.estampas = [...this.estampas, estampa].sort((a, b) => a.nome.localeCompare(b.nome));
      this.newEstampaNome = '';
      this.newEstampaValorAdicional = null;
      this.clearNewEstampaImage();
      this.flashSuccess('Estampa criada.');
      this.cdr.detectChanges();
    } catch {
      this.flashError('Erro ao criar a estampa.');
    } finally {
      this.creatingEstampa = false;
    }
  }

  askDeleteEstampa(estampa: Estampa): void {
    this.confirmAction = {
      message: `Excluir a estampa "${estampa.nome}"?`,
      onConfirm: () => this.deleteEstampa(estampa),
    };
  }

  private deleteEstampa(estampa: Estampa): void {
    this.estampaService.remove(estampa.id).subscribe({
      next: () => {
        this.estampas = this.estampas.filter((e) => e.id !== estampa.id);
        this.flashSuccess('Estampa removida.');
        this.cdr.detectChanges();
      },
      error: () => this.flashError('Erro ao remover a estampa.'),
    });
  }

  // ============ Confirmação / mensagens ============

  confirm(): void {
    const action = this.confirmAction;
    this.confirmAction = null;
    action?.onConfirm();
  }

  cancelConfirm(): void {
    this.confirmAction = null;
  }

  private flashSuccess(message: string): void {
    this.successMessage = message;
    this.errorMessage = '';
    setTimeout(() => {
      if (this.successMessage === message) this.successMessage = '';
      this.cdr.detectChanges();
    }, 3500);
  }

  private flashError(message: string): void {
    this.errorMessage = message;
    this.successMessage = '';
    setTimeout(() => {
      if (this.errorMessage === message) this.errorMessage = '';
      this.cdr.detectChanges();
    }, 3500);
  }
}
