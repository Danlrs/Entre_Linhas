import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { WhatsAppFloatComponent } from './components/whatsapp-float/whatsapp-float';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, WhatsAppFloatComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('Entre Linhas - Luciana Rios');
  showMobileMenu = false;
  showUserMenu = false;

  constructor(public authService: AuthService) {}

  ngOnInit(): void {}

  toggleMobileMenu(): void {
    this.showMobileMenu = !this.showMobileMenu;
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  logout(): void {
    this.authService.logout();
    this.showUserMenu = false;
  }

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get isLoggedIn() {
    return this.authService.isAuthenticated();
  }
}
