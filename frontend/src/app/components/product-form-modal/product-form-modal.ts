import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import {
  ImagemProduto,
  Product,
  ProductPayload,
  ProductSaveEvent,
} from '../../../../../shared/interfaces/products/product.interface';
import { Categoria } from '../../../../../shared/interfaces/products/categoria.interface';
import { Estampa } from '../../../../../shared/interfaces/products/estampa.interface';
import { Material } from '../../../../../shared/interfaces/products/material.interface';
import { ProdutoTamanho } from '../../../../../shared/interfaces/products/produto-tamanho.interface';
import { CategoriaService } from '../../services/categoria.service';
import { EstampaService } from '../../services/estampa.service';
import { MaterialService } from '../../services/material.service';
import { UploadService } from '../../services/upload.service';

interface PendingImage {
  id: string;
  url: string;
  principal: boolean;
  ordem: number;
  uploaded: boolean;
  file?: File;
  uploading?: boolean;
  error?: string;
  remoteId?: number;
}

interface PendingSize {
  uid: string;
  id?: number;
  nome: string;
  preco: number | null;
  profundidade: number | null;
  comprimento: number | null;
  largura: number | null;
  estoque: number | null;
  ativo: boolean;
}

@Component({
  selector: 'app-product-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './product-form-modal.html',
  styleUrls: ['./product-form-modal.css'],
})
export class ProductFormModal implements OnChanges {
  @Input() open = false;
  @Input() product: Product | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<ProductSaveEvent>();

  private editingId: number | null = null;

  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

  productForm!: FormGroup;

  categorias: Categoria[] = [];
  estampas: Estampa[] = [];
  materiais: Material[] = [];

  selectedCategoriaId: number | null = null;
  selectedEstampaIds = new Set<number>();
  selectedMaterialIds = new Set<number>();

  categoriaSearch = '';
  estampaSearch = '';
  materialSearch = '';

  showCreateCategoria = false;
  showCreateEstampa = false;
  showCreateMaterial = false;

  newCategoriaNome = '';
  newEstampaNome = '';
  newEstampaValorAdicional: number | null = null;
  newMaterialNome = '';
  newMaterialTipo = '';

  newEstampaFile: File | null = null;
  newEstampaPreview = '';
  newMaterialFile: File | null = null;
  newMaterialPreview = '';

  creatingCategoria = false;
  creatingEstampa = false;
  creatingMaterial = false;

  images: PendingImage[] = [];
  isDragging = false;
  isSubmitting = false;
  errorMessage = '';

  tamanhos: PendingSize[] = [];

  get isEditing(): boolean {
    return !!this.product;
  }

  constructor(
    private fb: FormBuilder,
    private categoriaService: CategoriaService,
    private estampaService: EstampaService,
    private materialService: MaterialService,
    private uploadService: UploadService,
    private cdr: ChangeDetectorRef,
  ) {
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(150)]],
      price: [0, [Validators.required, Validators.min(0)]],
      available: [true],
      descricao: [''],
      quantidadeEstampas: [1, [Validators.required, Validators.min(1)]],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    const justOpened = !!changes['open'] && this.open && !changes['open'].previousValue;

    if (justOpened) {
      this.editingId = typeof this.product?.id === 'number' ? this.product.id : null;
    }

    if (justOpened || (changes['product'] && this.open)) {
      this.initialize();
    }
  }

  private initialize(): void {
    this.errorMessage = '';
    this.isSubmitting = false;
    this.showCreateCategoria = false;
    this.showCreateEstampa = false;
    this.showCreateMaterial = false;
    this.newCategoriaNome = '';
    this.newEstampaNome = '';
    this.newEstampaValorAdicional = null;
    this.newMaterialNome = '';
    this.newMaterialTipo = '';
    this.clearNewEstampaImage();
    this.clearNewMaterialImage();
    this.categoriaSearch = '';
    this.estampaSearch = '';
    this.materialSearch = '';

    const p = this.product;

    this.productForm.reset({
      name: p?.name ?? '',
      price: this.toNumber(p?.price),
      available: p?.available ?? true,
      descricao: p?.descricao ?? '',
      quantidadeEstampas: Math.max(1, Math.floor(this.toNumber(p?.quantidadeEstampas) || 1)),
    });

    this.selectedCategoriaId = p?.categoriaId ?? p?.categoria?.id ?? null;
    this.selectedEstampaIds = new Set((p?.estampas ?? []).map((e) => e.id));
    this.selectedMaterialIds = new Set((p?.materiais ?? []).map((m) => m.id));

    this.images = (p?.imagens ?? []).map((img, idx) => ({
      id: `existing-${img.id ?? idx}`,
      url: img.url,
      principal: !!img.principal,
      ordem: img.ordem ?? idx,
      uploaded: true,
      remoteId: img.id,
    }));

    if (this.images.length === 0 && p?.image) {
      this.images.push({
        id: 'legacy-0',
        url: this.resolveLegacyImage(p.image),
        principal: true,
        ordem: 0,
        uploaded: true,
      });
    }

    this.tamanhos = (p?.tamanhos ?? []).map((t) => this.toPendingSize(t));

    this.loadOptions();
  }

  private toPendingSize(t: ProdutoTamanho): PendingSize {
    return {
      uid: `existing-${t.id ?? Math.random().toString(36).slice(2, 8)}`,
      id: t.id,
      nome: t.nome ?? '',
      preco: this.toNumberOrNull(t.preco),
      profundidade: this.toNumberOrNull(t.profundidade),
      comprimento: this.toNumberOrNull(t.comprimento),
      largura: this.toNumberOrNull(t.largura),
      estoque: this.toNumberOrNull(t.estoque),
      ativo: t.ativo ?? true,
    };
  }

  private resolveLegacyImage(image: string): string {
    if (!image) return '';
    if (/^(https?:)?\/\//.test(image) || image.startsWith('/')) return image;
    return `/assets/${image}`;
  }

  private toNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') return 0;
    const n = typeof value === 'number' ? value : parseFloat(String(value));
    return Number.isFinite(n) ? n : 0;
  }

  private toNumberOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = typeof value === 'number' ? value : parseFloat(String(value));
    return Number.isFinite(n) ? n : null;
  }

  private loadOptions(): void {
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

  get filteredCategorias(): Categoria[] {
    const q = this.categoriaSearch.trim().toLowerCase();
    if (!q) return this.categorias;
    return this.categorias.filter((c) => c.nome.toLowerCase().includes(q));
  }

  get filteredEstampas(): Estampa[] {
    const q = this.estampaSearch.trim().toLowerCase();
    if (!q) return this.estampas;
    return this.estampas.filter((e) => e.nome.toLowerCase().includes(q));
  }

  get filteredMateriais(): Material[] {
    const q = this.materialSearch.trim().toLowerCase();
    if (!q) return this.materiais;
    return this.materiais.filter(
      (m) =>
        m.nome.toLowerCase().includes(q) || (m.tipo ?? '').toLowerCase().includes(q),
    );
  }

  selectCategoria(id: number | null): void {
    this.selectedCategoriaId = this.selectedCategoriaId === id ? null : id;
  }

  toggleEstampa(id: number): void {
    if (this.selectedEstampaIds.has(id)) this.selectedEstampaIds.delete(id);
    else this.selectedEstampaIds.add(id);
  }

  toggleMaterial(id: number): void {
    if (this.selectedMaterialIds.has(id)) this.selectedMaterialIds.delete(id);
    else this.selectedMaterialIds.add(id);
  }

  // ============ Tamanhos ============

  addTamanho(): void {
    this.tamanhos = [
      ...this.tamanhos,
      {
        uid: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        nome: '',
        preco: null,
        profundidade: null,
        comprimento: null,
        largura: null,
        estoque: null,
        ativo: true,
      },
    ];
  }

  removeTamanho(uid: string): void {
    this.tamanhos = this.tamanhos.filter((t) => t.uid !== uid);
  }

  moveTamanho(uid: string, direction: -1 | 1): void {
    const idx = this.tamanhos.findIndex((t) => t.uid === uid);
    const newIdx = idx + direction;
    if (idx < 0 || newIdx < 0 || newIdx >= this.tamanhos.length) return;
    const next = [...this.tamanhos];
    const [item] = next.splice(idx, 1);
    next.splice(newIdx, 0, item);
    this.tamanhos = next;
  }

  trackTamanho = (_: number, item: PendingSize) => item.uid;

  // ============ Categorias / Estampas / Materiais inline ============

  createCategoria(): void {
    const nome = this.newCategoriaNome.trim();
    if (!nome) return;
    this.creatingCategoria = true;
    this.categoriaService.create({ nome }).subscribe({
      next: (categoria) => {
        this.categorias = [...this.categorias, categoria].sort((a, b) =>
          a.nome.localeCompare(b.nome),
        );
        this.selectedCategoriaId = categoria.id;
        this.newCategoriaNome = '';
        this.showCreateCategoria = false;
        this.creatingCategoria = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.creatingCategoria = false;
        this.errorMessage = 'Não foi possível criar a categoria.';
      },
    });
  }

  async createEstampa(): Promise<void> {
    const nome = this.newEstampaNome.trim();
    if (!nome) return;
    this.creatingEstampa = true;
    this.errorMessage = '';
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
      this.estampas = [...this.estampas, estampa].sort((a, b) =>
        a.nome.localeCompare(b.nome),
      );
      this.selectedEstampaIds.add(estampa.id);
      this.newEstampaNome = '';
      this.newEstampaValorAdicional = null;
      this.clearNewEstampaImage();
      this.showCreateEstampa = false;
      this.cdr.detectChanges();
    } catch {
      this.errorMessage = 'Não foi possível criar a estampa.';
    } finally {
      this.creatingEstampa = false;
    }
  }

  async createMaterial(): Promise<void> {
    const nome = this.newMaterialNome.trim();
    if (!nome) return;
    const tipo = this.newMaterialTipo.trim() || undefined;
    this.creatingMaterial = true;
    this.errorMessage = '';
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
      this.selectedMaterialIds.add(material.id);
      this.newMaterialNome = '';
      this.newMaterialTipo = '';
      this.clearNewMaterialImage();
      this.showCreateMaterial = false;
      this.cdr.detectChanges();
    } catch {
      this.errorMessage = 'Não foi possível criar o material.';
    } finally {
      this.creatingMaterial = false;
    }
  }

  onNewEstampaFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    this.clearNewEstampaImage();
    this.newEstampaFile = file;
    this.newEstampaPreview = URL.createObjectURL(file);
  }

  onNewMaterialFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    this.clearNewMaterialImage();
    this.newMaterialFile = file;
    this.newMaterialPreview = URL.createObjectURL(file);
  }

  clearNewEstampaImage(): void {
    if (this.newEstampaPreview) URL.revokeObjectURL(this.newEstampaPreview);
    this.newEstampaPreview = '';
    this.newEstampaFile = null;
  }

  clearNewMaterialImage(): void {
    if (this.newMaterialPreview) URL.revokeObjectURL(this.newMaterialPreview);
    this.newMaterialPreview = '';
    this.newMaterialFile = null;
  }

  triggerFileSelect(): void {
    this.fileInputRef?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.addFiles(Array.from(input.files));
      input.value = '';
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    if (event.dataTransfer?.files?.length) {
      this.addFiles(Array.from(event.dataTransfer.files));
    }
  }

  private addFiles(files: File[]): void {
    const accepted = files.filter((file) => file.type.startsWith('image/'));
    accepted.forEach((file) => {
      const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const url = URL.createObjectURL(file);
      const ordem = this.images.length;
      const principal = this.images.length === 0;
      this.images.push({ id, url, principal, ordem, uploaded: false, file });
    });
  }

  removeImage(image: PendingImage): void {
    if (!image.uploaded && image.url.startsWith('blob:')) {
      URL.revokeObjectURL(image.url);
    }
    this.images = this.images.filter((i) => i.id !== image.id);
    this.images.forEach((img, idx) => (img.ordem = idx));
    if (this.images.length > 0 && !this.images.some((i) => i.principal)) {
      this.images[0].principal = true;
    }
  }

  setPrincipal(image: PendingImage): void {
    this.images = this.images.map((i) => ({ ...i, principal: i.id === image.id }));
  }

  moveImage(image: PendingImage, direction: -1 | 1): void {
    const idx = this.images.findIndex((i) => i.id === image.id);
    const newIdx = idx + direction;
    if (idx < 0 || newIdx < 0 || newIdx >= this.images.length) return;
    const next = [...this.images];
    const [item] = next.splice(idx, 1);
    next.splice(newIdx, 0, item);
    next.forEach((img, i) => (img.ordem = i));
    this.images = next;
  }

  close(): void {
    this.images
      .filter((i) => !i.uploaded && i.url.startsWith('blob:'))
      .forEach((i) => URL.revokeObjectURL(i.url));
    this.closed.emit();
  }

  async submit(): Promise<void> {
    this.errorMessage = '';
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    const tamanhosLimpos = this.tamanhos
      .filter((t) => t.nome.trim().length > 0)
      .map((t, idx) => ({
        nome: t.nome.trim(),
        preco: this.toNumber(t.preco),
        profundidade: t.profundidade,
        comprimento: t.comprimento,
        largura: t.largura,
        estoque: t.estoque,
        ativo: t.ativo,
        ordem: idx,
      }));

    const incompletos = this.tamanhos.some(
      (t) => t.nome.trim().length === 0 || t.preco === null,
    );
    if (incompletos) {
      this.errorMessage = 'Cada tamanho precisa de um nome e um preço.';
      return;
    }

    this.isSubmitting = true;
    try {
      await this.uploadPendingImages();

      const formValue = this.productForm.value;
      const orderedImages = [...this.images].sort((a, b) => a.ordem - b.ordem);

      const payload: ProductPayload = {
        name: formValue.name?.trim() ?? '',
        price: Number(formValue.price ?? 0),
        available: !!formValue.available,
        descricao: formValue.descricao?.trim() || null,
        quantidadeEstampas: Math.max(1, Math.floor(Number(formValue.quantidadeEstampas ?? 1))),
        categoriaId: this.selectedCategoriaId,
        estampaIds: Array.from(this.selectedEstampaIds),
        materialIds: Array.from(this.selectedMaterialIds),
        imagens: orderedImages.map<ImagemProduto>((img, idx) => ({
          url: img.url,
          principal: img.principal,
          ordem: idx,
        })),
        tamanhos: tamanhosLimpos,
      };

      const principal = orderedImages.find((i) => i.principal) ?? orderedImages[0];
      payload.image = principal?.url ?? null;

      this.saved.emit({ editingId: this.editingId, payload });
      this.isSubmitting = false;

      this.images
        .filter((i) => i.url.startsWith('blob:'))
        .forEach((i) => URL.revokeObjectURL(i.url));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erro inesperado ao salvar o produto.';
      this.errorMessage = message;
      this.isSubmitting = false;
    }
  }

  private async uploadPendingImages(): Promise<void> {
    const pending = this.images.filter((i) => !i.uploaded && i.file);
    if (pending.length === 0) return;

    pending.forEach((p) => (p.uploading = true));

    try {
      const response = await firstValueFrom(
        this.uploadService.uploadProductImages(pending.map((p) => p.file!)),
      );

      response.files.forEach((uploaded, idx) => {
        const target = pending[idx];
        if (!target) return;
        if (target.url.startsWith('blob:')) URL.revokeObjectURL(target.url);
        target.url = uploaded.url;
        target.uploaded = true;
        target.uploading = false;
        target.file = undefined;
      });
    } catch {
      pending.forEach((p) => {
        p.uploading = false;
        p.error = 'Falha no upload.';
      });
      throw new Error('Falha ao enviar uma ou mais imagens.');
    }
  }
}
