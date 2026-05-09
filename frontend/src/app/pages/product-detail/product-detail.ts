import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { Product } from '../../../../../shared/interfaces/products/product.interface';
import { ProdutoTamanho } from '../../../../../shared/interfaces/products/produto-tamanho.interface';
import { Estampa } from '../../../../../shared/interfaces/products/estampa.interface';
import { ProductCard } from '../../components/product-card/product-card';

const PLACEHOLDER = 'https://via.placeholder.com/600x600?text=Produto';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductCard],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail implements OnInit, OnDestroy {
  product: Product | null = null;
  related: Product[] = [];
  isLoading = false;
  selectedImageIndex = 0;

  selectedTamanhoId: number | null = null;
  selectedEstampaIds: number[] = [];

  showLightbox = false;
  showShareMenu = false;
  copyFeedback = '';

  zoomActive = false;
  zoomX = 50;
  zoomY = 50;

  private readonly whatsappNumber = '5575991270779';
  private routeSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private title: Title,
    private meta: Meta,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) this.loadProduct(+id);
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.resetMetaTags();
  }

  private loadProduct(id: number): void {
    this.isLoading = true;
    this.product = null;
    this.related = [];
    this.selectedImageIndex = 0;
    this.selectedTamanhoId = null;
    this.selectedEstampaIds = [];
    this.showLightbox = false;
    this.showShareMenu = false;
    window.scrollTo({ top: 0, behavior: 'auto' });

    this.productService.getProductById(id).subscribe({
      next: (product) => {
        this.product = product;
        this.applyDefaultsFromProduct(product);
        this.applyMetaTags(product);
        this.loadRelated(product);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.product = null;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private applyDefaultsFromProduct(product: Product): void {
    const tamanhos = (product.tamanhos ?? []).filter((t) => t.ativo !== false);
    const firstTamanho = tamanhos[0];
    this.selectedTamanhoId = firstTamanho?.id ?? null;

    this.selectedEstampaIds = [];
  }

  private loadRelated(product: Product): void {
    this.productService.getAllProducts().subscribe({
      next: (all) => {
        const targetCategoria = product.categoriaId ?? product.categoria?.id;
        const productEstampaIds = new Set((product.estampas ?? []).map((e) => e.id));

        const score = (other: Product): number => {
          if (other.id === product.id) return -1;
          let s = 0;
          const otherCategoria = other.categoriaId ?? other.categoria?.id;
          if (targetCategoria && otherCategoria === targetCategoria) s += 3;
          (other.estampas ?? []).forEach((e) => {
            if (productEstampaIds.has(e.id)) s += 1;
          });
          return s;
        };

        this.related = all
          .map((p) => ({ p, s: score(p) }))
          .filter((x) => x.s > 0)
          .sort((a, b) => b.s - a.s)
          .slice(0, 4)
          .map((x) => x.p);

        this.cdr.detectChanges();
      },
      error: () => (this.related = []),
    });
  }

  // ============ META / OG ============

  private applyMetaTags(product: Product): void {
    const titleText = `${product.name} · Entre Linhas`;
    this.title.setTitle(titleText);

    const description = (product.descricao ?? '').trim() ||
      `Conheça ${product.name}, peça artesanal feita com carinho na Entre Linhas.`;
    const url = window.location.href;
    const image = this.galleryImages[0] || '';

    const tags: { property?: string; name?: string; content: string }[] = [
      { name: 'description', content: description },
      { property: 'og:title', content: titleText },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'product' },
      { property: 'og:url', content: url },
      { property: 'og:image', content: image },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: titleText },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: image },
    ];

    tags.forEach((tag) => {
      const selector = tag.property
        ? `property='${tag.property}'`
        : `name='${tag.name}'`;
      if (this.meta.getTag(selector)) {
        this.meta.updateTag(tag, selector);
      } else {
        this.meta.addTag(tag);
      }
    });
  }

  private resetMetaTags(): void {
    this.title.setTitle('Entre Linhas - Luciana Rios');
    [
      "property='og:title'",
      "property='og:description'",
      "property='og:type'",
      "property='og:url'",
      "property='og:image'",
      "name='twitter:card'",
      "name='twitter:title'",
      "name='twitter:description'",
      "name='twitter:image'",
    ].forEach((selector) => this.meta.removeTag(selector));
  }

  // ============ Galeria ============

  get galleryImages(): string[] {
    if (!this.product) return [];
    const list = [...(this.product.imagens ?? [])].sort(
      (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0),
    );
    if (list.length > 0) return list.map((img) => img.url);
    if (this.product.image) return [this.resolveLegacyImage(this.product.image)];
    return [PLACEHOLDER];
  }

  get currentImage(): string {
    return this.galleryImages[this.selectedImageIndex] ?? PLACEHOLDER;
  }

  selectImage(index: number): void {
    this.selectedImageIndex = index;
  }

  prevImage(): void {
    const total = this.galleryImages.length;
    if (total === 0) return;
    this.selectedImageIndex = (this.selectedImageIndex - 1 + total) % total;
  }

  nextImage(): void {
    const total = this.galleryImages.length;
    if (total === 0) return;
    this.selectedImageIndex = (this.selectedImageIndex + 1) % total;
  }

  openLightbox(): void {
    this.showLightbox = true;
    document.body.style.overflow = 'hidden';
  }

  closeLightbox(): void {
    this.showLightbox = false;
    document.body.style.overflow = '';
  }

  onZoomEnter(): void {
    this.zoomActive = true;
  }

  onZoomLeave(): void {
    this.zoomActive = false;
    this.zoomX = 50;
    this.zoomY = 50;
  }

  onZoomMove(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    this.zoomX = ((event.clientX - rect.left) / rect.width) * 100;
    this.zoomY = ((event.clientY - rect.top) / rect.height) * 100;
  }

  @HostListener('window:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (this.showLightbox) {
      if (event.key === 'Escape') this.closeLightbox();
      if (event.key === 'ArrowLeft') this.prevImage();
      if (event.key === 'ArrowRight') this.nextImage();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.showShareMenu) return;
    const el = event.target as HTMLElement;
    if (el.closest('[data-share-root]')) return;
    this.closeShareMenu();
  }

  private resolveLegacyImage(image: string): string {
    if (/^(https?:)?\/\//.test(image) || image.startsWith('/')) return image;
    return `/assets/${image}`;
  }

  // ============ Variações / Preço ============

  get availableTamanhos(): ProdutoTamanho[] {
    return (this.product?.tamanhos ?? [])
      .filter((t) => t.ativo !== false)
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  }

  get hasTamanhos(): boolean {
    return this.availableTamanhos.length > 0;
  }

  get selectedTamanho(): ProdutoTamanho | null {
    return this.availableTamanhos.find((t) => t.id === this.selectedTamanhoId) ?? null;
  }

  get availableEstampas(): Estampa[] {
    return this.product?.estampas ?? [];
  }

  get quantidadeEstampas(): number {
    const raw = this.product?.quantidadeEstampas;
    const value = typeof raw === 'number' ? raw : parseInt(String(raw ?? 1), 10);
    return Number.isFinite(value) && value > 0 ? value : 1;
  }

  get hasEstampas(): boolean {
    return this.availableEstampas.length > 0;
  }

  get selectedEstampas(): Estampa[] {
    return this.selectedEstampaIds
      .map((id) => this.availableEstampas.find((e) => e.id === id))
      .filter((e): e is Estampa => !!e);
  }

  isEstampaSelected(id: number): boolean {
    return this.selectedEstampaIds.includes(id);
  }

  estampaSelectionIndex(id: number): number {
    return this.selectedEstampaIds.indexOf(id) + 1;
  }

  estampaLimitReached(): boolean {
    return this.selectedEstampaIds.length >= this.quantidadeEstampas;
  }

  estampasRequiredMet(): boolean {
    if (!this.hasEstampas) return true;
    return this.selectedEstampaIds.length === this.quantidadeEstampas;
  }

  selectTamanho(id: number): void {
    this.selectedTamanhoId = id;
  }

  toggleEstampa(id: number): void {
    if (!this.product) return;
    const limit = this.quantidadeEstampas;
    const current = this.selectedEstampaIds;
    const idx = current.indexOf(id);
    if (idx >= 0) {
      this.selectedEstampaIds = current.filter((x) => x !== id);
      return;
    }
    if (limit === 1) {
      this.selectedEstampaIds = [id];
      return;
    }
    if (current.length >= limit) {
      // já no limite — ignora cliques em estampas novas
      return;
    }
    this.selectedEstampaIds = [...current, id];
  }

  private toNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') return 0;
    const n = typeof value === 'number' ? value : parseFloat(String(value));
    return Number.isFinite(n) ? n : 0;
  }

  get basePrice(): number {
    if (this.selectedTamanho) return this.toNumber(this.selectedTamanho.preco);
    return this.toNumber(this.product?.price);
  }

  get estampaAddon(): number {
    return this.selectedEstampas.reduce(
      (sum, e) => sum + this.toNumber(e.valorAdicional),
      0,
    );
  }

  get finalPrice(): number {
    return this.basePrice + this.estampaAddon;
  }

  get canBuy(): boolean {
    if (!this.product?.available) return false;
    if (!this.estampasRequiredMet()) return false;
    return true;
  }

  get buyDisabledReason(): string {
    if (!this.product?.available) return '';
    if (this.hasEstampas && !this.estampasRequiredMet()) {
      const total = this.quantidadeEstampas;
      const escolhidas = this.selectedEstampaIds.length;
      return `Selecione ${total} ${total === 1 ? 'estampa' : 'estampas'} (${escolhidas}/${total}).`;
    }
    return '';
  }

  formatPrice(value: number): string {
    return value.toFixed(2).replace('.', ',');
  }

  get priceLabel(): string {
    return this.formatPrice(this.finalPrice);
  }

  // ============ Compartilhar / WhatsApp ============

  toggleShareMenu(): void {
    this.showShareMenu = !this.showShareMenu;
  }

  closeShareMenu(): void {
    this.showShareMenu = false;
  }

  get currentUrl(): string {
    return typeof window !== 'undefined' ? window.location.href : '';
  }

  /** Texto curto para compartilhar com amigos (não é o fluxo de compra no número da loja). */
  private get casualShareMessage(): string {
    const url = this.currentUrl;
    return `Olha esse produto que encontrei!\n\n${url}`;
  }

  /**
   * WhatsApp “compartilhar”: sem número — abre o app/Web para o usuário escolher o contato e enviar o texto.
   * @see https://faq.whatsapp.com/general/chats/how-to-use-click-to-chat (variante só com texto via api.whatsapp.com/send)
   */
  getWhatsAppShareLink(): string {
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(this.casualShareMessage)}`;
  }

  getWhatsAppLink(): string {
    if (!this.product) return '';
    const parts: string[] = [];
    parts.push(`Olá! Tenho interesse no produto *${this.product.name}*.`);
    if (this.selectedTamanho) parts.push(`Tamanho: ${this.selectedTamanho.nome}`);

    const estampas = this.selectedEstampas;
    if (estampas.length > 0) {
      const label = estampas.length === 1 ? 'Estampa' : 'Estampas';
      parts.push(`${label}: ${estampas.map((e) => e.nome).join(', ')}`);
    }

    const materiais = this.product.materiais ?? [];
    if (materiais.length > 0) {
      parts.push(`Materiais: ${materiais.map((m) => m.nome).join(', ')}`);
    }

    parts.push(`Valor: R$ ${this.priceLabel}`);
    parts.push(this.currentUrl);
    const encodedMessage = encodeURIComponent(parts.join('\n'));
    return `https://wa.me/${this.whatsappNumber}?text=${encodedMessage}`;
  }

  shareWhatsApp(): void {
    const url = this.getWhatsAppShareLink();
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
    this.closeShareMenu();
  }

  /**
   * Instagram não tem URL web estável como o WhatsApp; no celular usamos o menu nativo de compartilhar,
   * onde o usuário escolhe Instagram (Direct, Stories, etc.).
   */
  async shareInstagram(): Promise<void> {
    const url = this.currentUrl;
    if (!url) return;

    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({
          title: this.product?.name ?? 'Produto',
          text: 'Olha esse produto que encontrei!',
          url,
        });
        this.closeShareMenu();
        return;
      }
    } catch (err: unknown) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'AbortError') {
        return;
      }
    }

    const ok = await this.writeTextToClipboard(this.casualShareMessage);
    this.copyFeedback = ok
      ? 'Texto copiado! Abra o Instagram e cole no Direct ou story.'
      : 'Não foi possível copiar. Use “Copiar link” abaixo.';
    this.cdr.detectChanges();
    window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
    setTimeout(() => {
      this.copyFeedback = '';
      this.closeShareMenu();
      this.cdr.detectChanges();
    }, ok ? 600 : 2200);
  }

  async copyLink(): Promise<void> {
    const ok = await this.writeProductUrlToClipboard();
    this.copyFeedback = ok ? 'Link copiado!' : 'Não foi possível copiar.';
    this.cdr.detectChanges();
    setTimeout(() => {
      this.copyFeedback = '';
      this.cdr.detectChanges();
    }, ok ? 2000 : 2500);
  }

  private async writeProductUrlToClipboard(): Promise<boolean> {
    return this.writeTextToClipboard(this.currentUrl);
  }

  private async writeTextToClipboard(text: string): Promise<boolean> {
    if (!text) return false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }

  navigateToRelated(productId: number): void {
    void this.router.navigate(['/product', productId]);
  }
}
