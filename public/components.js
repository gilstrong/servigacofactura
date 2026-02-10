// c:\Users\jaime\Downloads\Page Tesis\components.js

class ServiGacoNav extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <nav class="main-nav" role="navigation" aria-label="Navegación principal">
        <div class="nav-container">
          <!-- Logo -->
          <div class="nav-brand">
            <img src="assets/logo.png" alt="Logo ServiGaco" class="nav-logo" />
          </div>

          <!-- Links de navegación -->
          <ul class="nav-links">
            <li class="nav-item">
              <a href="calculadora_general.html" class="nav-link" id="navGeneral">
                <span class="nav-icon">📋</span>
                <span class="nav-text">Servicios Generales</span>
              </a>
            </li>
          </ul>

          <!-- Botón Login/Logout (Seguridad) -->
          <button id="btnAuthNav" type="button" class="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none rounded-lg text-sm p-2.5 mr-1 transition-all" title="Acceso Empleados">
            <span id="iconAuth">🔓</span>
          </button>

          <!-- Botón Dark Mode -->
          <button id="theme-toggle" type="button" class="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700 rounded-lg text-sm p-2.5 mr-2 transition-all duration-300">
            <svg id="theme-toggle-dark-icon" class="hidden w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>
            <svg id="theme-toggle-light-icon" class="hidden w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z" fill-rule="evenodd" clip-rule="evenodd"></path></svg>
          </button>

          <!-- Botón móvil (hamburguesa) -->
          <button class="nav-toggle" aria-label="Abrir menú" aria-expanded="false">
            <span class="hamburger"></span>
          </button>
        </div>
      </nav>
    `;

    this.inicializarLogica();
  }

  inicializarLogica() {
    // 1. Marcar página activa
    const paginaActual = window.location.pathname.split('/').pop() || 'index.html';
    const linkGeneral = this.querySelector('#navGeneral');

    if (paginaActual === 'calculadora_general.html' || paginaActual === 'index.html' || paginaActual === '') {
      linkGeneral?.classList.add('active');
    }

    // 2. Lógica Menú Móvil
    const navToggle = this.querySelector('.nav-toggle');
    const navLinks = this.querySelector('.nav-links');
    
    if (navToggle && navLinks) {
      navToggle.addEventListener('click', () => {
        const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
        navToggle.setAttribute('aria-expanded', !isExpanded);
        navLinks.classList.toggle('active');
      });
      
      // Cerrar al hacer click fuera
      document.addEventListener('click', (e) => {
        if (!this.contains(e.target)) {
          navToggle.setAttribute('aria-expanded', 'false');
          navLinks.classList.remove('active');
        }
      });
    }

    // 3. Lógica Dark Mode
    const themeToggleBtn = this.querySelector('#theme-toggle');
    const darkIcon = this.querySelector('#theme-toggle-dark-icon');
    const lightIcon = this.querySelector('#theme-toggle-light-icon');

    // Verificar tema inicial
    if (localStorage.getItem('color-theme') === 'dark' || (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      lightIcon.classList.remove('hidden');
    } else {
      document.documentElement.classList.remove('dark');
      darkIcon.classList.remove('hidden');
    }

    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        darkIcon.classList.toggle('hidden');
        lightIcon.classList.toggle('hidden');

        if (localStorage.getItem('color-theme')) {
          if (localStorage.getItem('color-theme') === 'light') {
            document.documentElement.classList.add('dark');
            localStorage.setItem('color-theme', 'dark');
          } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('color-theme', 'light');
          }
        } else {
          if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('color-theme', 'light');
          } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('color-theme', 'dark');
          }
        }
      });
    }
  }
}

customElements.define('servigaco-nav', ServiGacoNav);

class ServiGacoFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <footer class="w-full mt-12 p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 text-center transition-all duration-300 hover:shadow-xl">
        <div class="flex flex-col items-center justify-center gap-4">
          <div class="flex items-center gap-3">
            <span class="text-2xl font-black bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent font-montserrat">ServiGaco</span>
            <span class="w-px h-6 bg-gray-300 dark:bg-gray-600"></span>
            <span class="text-sm font-semibold text-gray-500 dark:text-gray-400 tracking-wide uppercase">Calidad y Rapidez</span>
          </div>
          
          <p class="text-sm text-gray-500 dark:text-gray-400 max-w-md leading-relaxed">
            Expertos en impresión de tesis, planos y material publicitario. 
            <br>Ubicados en Santo Domingo, República Dominicana.
          </p>
          
          <div class="w-full h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent my-2"></div>

          <div class="text-xs font-medium text-gray-400 dark:text-gray-500">
            &copy; ${new Date().getFullYear()} ServiGaco. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    `;
  }
}

customElements.define('servigaco-footer', ServiGacoFooter);
