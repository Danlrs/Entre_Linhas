import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface SettingsNavItem {
  label: string;
  description: string;
  icon: 'user' | 'box';
  route: string;
}

@Component({
  selector: 'app-settings-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './settings-layout.html',
  styleUrl: './settings-layout.css',
})
export class SettingsLayout implements OnInit {
  navItems: SettingsNavItem[] = [
    {
      label: 'Conta',
      description: 'Atualize seus dados e senha',
      icon: 'user',
      route: '/configuracoes/conta',
    },
    {
      label: 'Catálogo',
      description: 'Produtos, categorias, materiais e estampas',
      icon: 'box',
      route: '/configuracoes/catalogo',
    },
  ];

  constructor(public authService: AuthService) {}

  ngOnInit(): void {}

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get initials(): string {
    return this.currentUser?.login?.charAt(0)?.toUpperCase() ?? '?';
  }
}
