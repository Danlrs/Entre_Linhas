import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { CategoriaService } from '../../services/categoria.service';
import { Product } from '../../../../../shared/interfaces/products/product.interface';
import { Categoria } from '../../../../../shared/interfaces/products/categoria.interface';
import { ProductCard } from '../../components/product-card/product-card';

interface Testimonial {
  name: string;
  role: string;
  message: string;
  initial: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductCard],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  novidades: Product[] = [];
  categorias: Categoria[] = [];
  loading = true;

  testimonials: Testimonial[] = [
    {
      name: 'Mariana Lopes',
      role: 'Cliente desde 2025',
      message:
        'A qualidade das peças é impressionante. Cada detalhe é feito com tanto carinho que dá pra sentir.',
      initial: 'M',
    },
    {
      name: 'Beatriz Almeida',
      role: 'Cliente recorrente',
      message:
        'Fui surpreendida pelo acabamento. Encomendei uma necessaire estampada e virou meu acessório favorito.',
      initial: 'B',
    },
    {
      name: 'Júlia Santos',
      role: 'Presenteou amigas',
      message:
        'Atendimento atencioso e produtos lindos. Já indiquei para todas as amigas — todo mundo amou!',
      initial: 'J',
    },
  ];

  constructor(
    private productService: ProductService,
    private categoriaService: CategoriaService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadProducts();
    this.loadCategorias();
  }

  private loadProducts(): void {
    this.loading = true;
    this.productService.getAllProducts().subscribe({
      next: (data) => {
        this.novidades = [...data]
          .filter((p) => p.available)
          .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))
          .slice(0, 8);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.novidades = [];
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private loadCategorias(): void {
    this.categoriaService.getAll().subscribe({
      next: (data) => {
        this.categorias = [...data].sort((a, b) => a.nome.localeCompare(b.nome));
        this.cdr.detectChanges();
      },
      error: () => (this.categorias = []),
    });
  }

  navigateToCategoria(id: number): void {
    void this.router.navigate(['/catalogo'], { queryParams: { categoria: id } });
  }
}
