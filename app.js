const WHATSAPP_NUMBER = "254769218680";

const productsGrid = document.getElementById("productsGrid");
const noProducts = document.getElementById("noProducts");
const databaseError = document.getElementById("databaseError");
const retryProducts = document.getElementById("retryProducts");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const currentYear = document.getElementById("currentYear");

let allProducts = [];
let selectedCategory = "all";

document.addEventListener("DOMContentLoaded", () => {
  currentYear.textContent = new Date().getFullYear();

  loadProducts();

  searchInput.addEventListener("input", renderFilteredProducts);

  retryProducts.addEventListener("click", () => {
    loadProducts();
  });
});


async function loadProducts() {
  showLoading();

  const { data, error } = await window.supabaseClient
    .from("products")
    .select(`
      id,
      name,
      price,
      category,
      image_url,
      description,
      available,
      created_at
    `)
    .eq("available", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Product loading error:", error);
    showDatabaseError();
    return;
  }

  allProducts = data || [];

  buildCategories();
  renderFilteredProducts();
}


function buildCategories() {
  const categories = [
    ...new Set(
      allProducts
        .map(product => product.category)
        .filter(Boolean)
    )
  ].sort();

  categoryFilter.innerHTML = "";

  const allButton = document.createElement("button");
  allButton.className = "category-btn active";
  allButton.dataset.category = "all";
  allButton.textContent = "All";

  allButton.addEventListener("click", () => {
    selectedCategory = "all";
    updateCategoryButtons();
    renderFilteredProducts();
  });

  categoryFilter.appendChild(allButton);

  categories.forEach(category => {
    const button = document.createElement("button");

    button.className = "category-btn";
    button.dataset.category = category;
    button.textContent = category;

    button.addEventListener("click", () => {
      selectedCategory = category;
      updateCategoryButtons();
      renderFilteredProducts();
    });

    categoryFilter.appendChild(button);
  });
}


function updateCategoryButtons() {
  document.querySelectorAll(".category-btn").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.category === selectedCategory
    );
  });
}


function renderFilteredProducts() {
  const searchTerm = searchInput.value.trim().toLowerCase();

  const filtered = allProducts.filter(product => {
    const matchesCategory =
      selectedCategory === "all" ||
      product.category === selectedCategory;

    const searchableText = `
      ${product.name || ""}
      ${product.category || ""}
      ${product.description || ""}
    `.toLowerCase();

    const matchesSearch = searchableText.includes(searchTerm);

    return matchesCategory && matchesSearch;
  });

  renderProducts(filtered);
}


function renderProducts(products) {
  productsGrid.innerHTML = "";

  noProducts.classList.add("hidden");
  databaseError.classList.add("hidden");

  if (!products.length) {
    noProducts.classList.remove("hidden");
    return;
  }

  products.forEach(product => {
    productsGrid.appendChild(createProductCard(product));
  });
}


function createProductCard(product) {
  const card = document.createElement("article");
  card.className = "product-card";

  const imageContainer = document.createElement("div");
  imageContainer.className = "product-image";

  if (product.image_url) {
    const image = document.createElement("img");

    image.src = product.image_url;
    image.alt = product.name;
    image.loading = "lazy";

    image.onerror = () => {
      image.remove();

      const placeholder = document.createElement("div");
      placeholder.className = "product-placeholder";
      placeholder.textContent = "🛍️";

      imageContainer.appendChild(placeholder);
    };

    imageContainer.appendChild(image);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "product-placeholder";
    placeholder.textContent = "🛍️";
    imageContainer.appendChild(placeholder);
  }

  const category = document.createElement("span");
  category.className = "product-category";
  category.textContent = product.category || "Product";

  imageContainer.appendChild(category);

  const info = document.createElement("div");
  info.className = "product-info";

  const title = document.createElement("h3");
  title.textContent = product.name;

  const description = document.createElement("p");
  description.className = "product-description";
  description.textContent =
    product.description ||
    "Quality product available from Pristage Online Shop.";

  const bottom = document.createElement("div");
  bottom.className = "product-bottom";

  const price = document.createElement("span");
  price.className = "product-price";
  price.textContent = formatPrice(product.price);

  const orderButton = document.createElement("a");
  orderButton.className = "order-btn";
  orderButton.target = "_blank";
  orderButton.rel = "noopener";
  orderButton.textContent = "Order on WhatsApp";

  const message =
    `Hello Pristage Online Shop,%0A%0A` +
    `I am interested in:%0A` +
    `${product.name}%0A` +
    `Price: ${formatPrice(product.price)}%0A%0A` +
    `My name:%0A` +
    `My phone number:%0A` +
    `My delivery location:%0A%0A` +
    `Please confirm the delivery cost for my location.`;

  orderButton.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;

  bottom.appendChild(price);
  bottom.appendChild(orderButton);

  info.appendChild(title);
  info.appendChild(description);
  info.appendChild(bottom);

  card.appendChild(imageContainer);
  card.appendChild(info);

  return card;
}


function formatPrice(value) {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return "KSh";
  }

  return `KSh ${number.toLocaleString("en-KE")}`;
}


function showLoading() {
  productsGrid.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="loader"></div>
        <p>Loading products...</p>
      </div>
    </div>
  `;

  noProducts.classList.add("hidden");
  databaseError.classList.add("hidden");
}


function showDatabaseError() {
  productsGrid.innerHTML = "";
  noProducts.classList.add("hidden");
  databaseError.classList.remove("hidden");
}
