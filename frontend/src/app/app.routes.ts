import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { ProductList } from './pages/product-list/product-list';
import { ProductDetail } from './pages/product-detail/product-detail';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { SettingsLayout } from './pages/settings/settings-layout';
import { AccountSettings } from './pages/settings/account/account-settings';
import { CatalogSettings } from './pages/settings/catalog/catalog-settings';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'catalogo', component: ProductList },
  { path: 'product/:id', component: ProductDetail },
  { path: 'admin', component: Login },
  { path: 'admin/recuperar-senha', loadComponent: () => import('./pages/password-recovery/password-recovery').then((m) => m.PasswordRecovery) },
  { path: 'cadastro', redirectTo: 'admin', pathMatch: 'full' },
  { path: 'cadastro/convite', component: Register },
  {
    path: 'configuracoes',
    component: SettingsLayout,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'conta', pathMatch: 'full' },
      { path: 'conta', component: AccountSettings },
      { path: 'catalogo', component: CatalogSettings },
      { path: 'usuarios', loadComponent: () => import('./pages/settings/users/users-settings').then((m) => m.UsersSettings) },
    ],
  },
];
