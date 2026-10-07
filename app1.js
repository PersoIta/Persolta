/* =========================================================
   CONFIGURAÇÃO DO SUPABASE
   Troque somente estes dois valores.
   Use a chave ANON/PUBLISHABLE, NUNCA service_role.
   ========================================================= */
const SUPABASE_URL = "https://tzolokxetilunyfzovav.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0HJWnbqDMg1LFwLuhaRLDg_FvEXwxZd";


const { createClient } = supabase;

const db = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

let currentUser = null;
let currentStore = null;

function $(id) {
  return document.getElementById(id);
}

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    function (match) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[match];
    }
  );
}

function showMessage(element, text, type = "error") {
  if (!element) {
    return;
  }

  element.innerHTML =
    '<div class="message ' +
    type +
    '">' +
    escapeHtml(text) +
    "</div>";
}

function go(page) {
  if (page === "catalogo") {
    if (currentStore && currentStore.id_loja) {
      window.location.href =
        "catalogo.html?loja=" +
        encodeURIComponent(currentStore.id_loja);
      return;
    }

    window.location.href = "catalogo.html";
    return;
  }

  window.location.href = page + ".html";
}

function openModal(title, html) {
  const modal = $("modal");

  if ($("modalTitle")) {
    $("modalTitle").textContent = title;
  }

  if ($("modalContent")) {
    $("modalContent").innerHTML = html;
  }

  if (modal) {
    modal.classList.remove("hidden");
  }
}

function closeModal() {
  const modal = $("modal");

  if (modal) {
    modal.classList.add("hidden");
  }
}

async function login() {
  const loginForm = $("loginForm");

  if (!loginForm) {
    return;
  }

  loginForm.addEventListener(
    "submit",
    async function (event) {
      event.preventDefault();

      const emailElement = $("loginEmail");
      const passwordElement = $("loginPassword");
      const message = $("loginMessage");

      const email = emailElement
        ? emailElement.value.trim()
        : "";

      const password = passwordElement
        ? passwordElement.value
        : "";

      if (!email || !password) {
        showMessage(
          message,
          "Informe seu e-mail e sua senha."
        );

        return;
      }

      const button =
        loginForm.querySelector(
          'button[type="submit"]'
        );

      if (button) {
        button.disabled = true;
        button.textContent = "Entrando...";
      }

      if (message) {
        message.innerHTML = "";
      }

      try {
        const result =
          await db.auth.signInWithPassword({
            email: email,
            password: password
          });

        if (result.error) {
          console.error(
            "Erro no login:",
            result.error
          );

          showMessage(
            message,
            result.error.message
          );

          return;
        }

        currentUser = result.data.user;

        window.location.href =
          "dashboard.html";

      } catch (error) {
        console.error(
          "Erro inesperado no login:",
          error
        );

        showMessage(
          message,
          error.message ||
          "Erro inesperado ao realizar login."
        );

      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = "Entrar";
        }
      }
    }
  );
}

async function requireAuth() {
  try {
    const result =
      await db.auth.getSession();

    if (result.error) {
      console.error(
        "Erro ao verificar sessão:",
        result.error
      );

      window.location.replace(
        "index.html"
      );

      return false;
    }

    const session =
      result.data.session;

    if (!session) {
      window.location.replace(
        "index.html"
      );

      return false;
    }

    currentUser = session.user;

    return true;

  } catch (error) {
    console.error(
      "Erro ao verificar autenticação:",
      error
    );

    window.location.replace(
      "index.html"
    );

    return false;
  }
}

async function logout() {
  try {
    await db.auth.signOut();

  } catch (error) {
    console.error(
      "Erro ao sair:",
      error
    );
  }

  window.location.replace(
    "index.html"
  );
}

async function loadUserContext() {
  if (!currentUser) {
    return false;
  }

  try {
    const result =
      await db
        .from("gestao_loja_usuarios")
        .select(
          "id,id_loja,nome,email,perfil,ativo"
        )
        .eq(
          "id",
          currentUser.id
        )
        .single();

    if (result.error) {
      console.error(
        "Erro ao carregar usuário:",
        result.error
      );

      return false;
    }

    const user = result.data;

    if (!user) {
      await logout();

      return false;
    }

    if (!user.ativo) {
      alert(
        "Seu usuário está inativo."
      );

      await logout();

      return false;
    }

    const storeResult =
      await db
        .from("gestao_loja_lojas")
        .select("*")
        .eq(
          "id_loja",
          user.id_loja
        )
        .single();

    if (storeResult.error) {
      console.error(
        "Erro ao carregar loja:",
        storeResult.error
      );

      return false;
    }

    currentStore =
      storeResult.data;

    if ($("userName")) {
      $("userName").textContent =
        user.nome ||
        "Usuário";
    }

    if ($("userEmail")) {
      $("userEmail").textContent =
        currentStore.nome_fantasia ||
        currentStore.nome ||
        "Loja";
    }

    if ($("storeName")) {
      $("storeName").textContent =
        currentStore.nome_fantasia ||
        currentStore.nome ||
        "Loja";
    }

    return true;

  } catch (error) {
    console.error(
      "Erro ao carregar contexto:",
      error
    );

    return false;
  }
}

async function loadMenu() {
  const menu = $("menu");

  if (!menu) {
    return;
  }

  try {
    const response =
      await fetch(
        "menu.html",
        {
          cache: "no-cache"
        }
      );

    if (!response.ok) {
      throw new Error(
        "Não foi possível carregar o menu."
      );
    }

    menu.innerHTML =
      await response.text();

    if (
      currentStore &&
      $("storeName")
    ) {
      $("storeName").textContent =
        currentStore.nome_fantasia ||
        currentStore.nome ||
        "Loja";
    }

    setActiveNav();

  } catch (error) {
    console.error(
      "Erro ao carregar menu:",
      error
    );
  }
}

function setActiveNav() {
  const page =
    document.body.dataset.page;

  document
    .querySelectorAll(".nav button")
    .forEach(
      function (button) {
        button.classList.toggle(
          "active",
          button.dataset.page === page
        );
      }
    );
}

async function initDashboard() {
  const authenticated =
    await requireAuth();

  if (!authenticated) {
    return;
  }

  const contextLoaded =
    await loadUserContext();

  if (!contextLoaded) {
    return;
  }

  setActiveNav();

  if ($("pageSubtitle")) {
    $("pageSubtitle").textContent =
      "Visão geral da loja";
  }

  try {
    const [
      products,
      variations,
      clients
    ] = await Promise.all([
      db
        .from(
          "gestao_loja_produtos"
        )
        .select(
          "id",
          {
            count: "exact",
            head: true
          }
        ),

      db
        .from(
          "gestao_loja_produtos_variacoes"
        )
        .select(
          "id",
          {
            count: "exact",
            head: true
          }
        ),

      db
        .from(
          "gestao_loja_clientes"
        )
        .select(
          "id",
          {
            count: "exact",
            head: true
          }
        )
    ]);

    const stock =
      await db
        .from(
          "gestao_loja_produtos_variacoes"
        )
        .select("estoque");

    if ($("countProducts")) {
      $("countProducts").textContent =
        products.count || 0;
    }

    if ($("countVariations")) {
      $("countVariations").textContent =
        variations.count || 0;
    }

    if ($("countClients")) {
      $("countClients").textContent =
        clients.count || 0;
    }

    if ($("totalStock")) {
      $("totalStock").textContent =
        (stock.data || []).reduce(
          function (total, item) {
            return (
              total +
              Number(
                item.estoque || 0
              )
            );
          },
          0
        );
    }

  } catch (error) {
    console.error(
      "Erro ao carregar dashboard:",
      error
    );

    const content =
      $("content");

    if (content) {
      content.insertAdjacentHTML(
        "afterbegin",
        '<div class="message error">' +
        escapeHtml(
          error.message ||
          "Erro desconhecido."
        ) +
        "</div>"
      );
    }
  }
}

document.addEventListener(
  "DOMContentLoaded",
  function () {
    login();

    if (
      document.body.dataset.page ===
      "dashboard"
    ) {
      initDashboard();
    }

    loadMenu();
  }
);