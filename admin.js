const supabase = window.supabaseClient;

const loginScreen = document.getElementById("loginScreen");
const adminApp = document.getElementById("adminApp");

const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");

const logoutButton = document.getElementById("logoutButton");

const productForm = document.getElementById("productForm");
const productId = document.getElementById("productId");
const productName = document.getElementById("productName");
const productPrice = document.getElementById("productPrice");
const productCategory = document.getElementById("productCategory");
const productDescription = document.getElementById("productDescription");
const productImage = document.getElementById("productImage");
const productAvailable = document.getElementById("productAvailable");

const imagePreview = document.getElementById("imagePreview");

const formTitle = document.getElementById("formTitle");
const saveButton = document.getElementById("saveButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const formMessage = document.getElementById("formMessage");

const adminProducts = document.getElementById("adminProducts");
const productCount = document.getElementById("productCount");
const refreshButton = document.getElementById("refreshButton");

let editingProduct = null;


document.addEventListener("DOMContentLoaded", async () => {
  await checkSession();

  loginForm.addEventListener("submit", handleLogin);
  logoutButton.addEventListener("click", handleLogout);
  productForm.addEventListener("submit", handleProductSave);
  cancelEditButton.addEventListener("click", resetProductForm);
  refreshButton.addEventListener("click", loadAdminProducts);

  productImage.addEventListener("change", previewSelectedImage);
});


async function checkSession() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    showLogin();
    return;
  }

  const isAdmin = await verifyAdmin(session.user.id);

  if (!isAdmin) {
    await supabase.auth.signOut();
    showLogin();
    showLoginMessage(
      "This account is not authorized to access the admin panel.",
      "error"
    );
    return;
  }

  showAdmin();
  await loadAdminProducts();
}


async function verifyAdmin(userId) {
  const { data, error } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Admin verification error:", error);
    return false;
  }

  return !!data;
}


async function handleLogin(event) {
  event.preventDefault();

  clearLoginMessage();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    showLoginMessage("Enter your email and password.", "error");
    return;
  }

  const originalText = event.submitter
    ? event.submitter.textContent
    : "Sign In";

  if (event.submitter) {
    event.submitter.disabled = true;
    event.submitter.textContent = "Signing in...";
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (event.submitter) {
    event.submitter.disabled = false;
    event.submitter.textContent = originalText;
  }

  if (error) {
    console.error(error);
    showLoginMessage(
      "Login failed. Check your email and password.",
      "error"
    );
    return;
  }

  const isAdmin = await verifyAdmin(data.user.id);

  if (!isAdmin) {
    await supabase.auth.signOut();

    showLoginMessage(
      "This account is not authorized as an administrator.",
      "error"
    );

    return;
  }

  showAdmin();
  await loadAdminProducts();
}


async function handleLogout() {
  await supabase.auth.signOut();
  resetProductForm();
  showLogin();
}


function showLogin() {
  loginScreen.classList.remove("hidden");
  adminApp.classList.add("hidden");
}


function showAdmin() {
  loginScreen.classList.add("hidden");
  adminApp.classList.remove("hidden");
}


function showLoginMessage(message, type) {
  loginMessage.textContent = message;
  loginMessage.className = `message ${type}`;
}


function clearLoginMessage() {
  loginMessage.textContent = "";
  loginMessage.className = "message";
}


async function loadAdminProducts() {
  adminProducts.innerHTML = `
    <div class="admin-loading">
      <div>
        <div class="spinner"></div>
        <p>Loading products...</p>
      </div>
    </div>
  `;

  const { data, error } = await supabase
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
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);

    adminProducts.innerHTML = `
      <div class="empty-products">
        Could not load products.
      </div>
    `;

    return;
  }

  productCount.textContent = data.length;

  renderAdminProducts(data);
}


function renderAdminProducts(products) {
  if (!products.length) {
    adminProducts.innerHTML = `
      <div class="empty-products">
        No products yet. Add your first product using the form.
      </div>
    `;

    return;
  }

  adminProducts.innerHTML = "";

  products.forEach(product => {
    const item = document.createElement("div");
    item.className = "admin-product";

    const image = product.image_url
      ? `
        <img
          src="${escapeHtml(product.image_url)}"
          alt="${escapeHtml(product.name)}"
        >
      `
      : "🛍️";

    item.innerHTML = `
      <div class="admin-product-image">
        ${image}
      </div>

      <div class="admin-product-info">
        <h3>${escapeHtml(product.name)}</h3>

        <p>${escapeHtml(product.category || "Product")}</p>

        <p class="admin-product-price">
          ${formatPrice(product.price)}
        </p>

        ${
          product.available
            ? `<span class="status available">VISIBLE TO CUSTOMERS</span>`
            : `<span class="status hidden-status">HIDDEN</span>`
        }
      </div>

      <div class="product-actions">

        <button
          class="edit-btn"
          data-action="edit"
          data-id="${product.id}"
        >
          Edit
        </button>

        <button
          class="toggle-btn"
          data-action="toggle"
          data-id="${product.id}"
        >
          ${product.available ? "Hide" : "Show"}
        </button>

        <button
          class="delete-btn"
          data-action="delete"
          data-id="${product.id}"
        >
          Delete
        </button>

      </div>
    `;

    adminProducts.appendChild(item);
  });

  document.querySelectorAll("[data-action='edit']").forEach(button => {
    button.addEventListener("click", () => {
      editProductById(
        products,
        Number(button.dataset.id)
      );
    });
  });

  document.querySelectorAll("[data-action='toggle']").forEach(button => {
    button.addEventListener("click", () => {
      toggleProduct(
        Number(button.dataset.id)
      );
    });
  });

  document.querySelectorAll("[data-action='delete']").forEach(button => {
    button.addEventListener("click", () => {
      deleteProduct(
        Number(button.dataset.id)
      );
    });
  });
}


function editProductById(products, id) {
  const product = products.find(item => item.id === id);

  if (!product) {
    return;
  }

  editingProduct = product;

  productId.value = product.id;
  productName.value = product.name || "";
  productPrice.value = product.price || "";
  productCategory.value = product.category || "";
  productDescription.value = product.description || "";
  productAvailable.checked = product.available !== false;

  formTitle.textContent = "Edit Product";
  saveButton.textContent = "Update Product";
  cancelEditButton.classList.remove("hidden");

  formMessage.textContent = "";
  formMessage.className = "message";

  if (product.image_url) {
    imagePreview.innerHTML = `
      <img
        src="${escapeHtml(product.image_url)}"
        alt="${escapeHtml(product.name)}"
      >
    `;

    imagePreview.classList.remove("hidden");
  } else {
    imagePreview.classList.add("hidden");
    imagePreview.innerHTML = "";
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


async function handleProductSave(event) {
  event.preventDefault();

  clearFormMessage();

  const name = productName.value.trim();
  const price = Number(productPrice.value);
  const category = productCategory.value.trim();
  const description = productDescription.value.trim();
  const available = productAvailable.checked;
  const file = productImage.files[0];

  if (!name) {
    showFormMessage("Product name is required.", "error");
    return;
  }

  if (!price || price < 0) {
    showFormMessage("Enter a valid product price.", "error");
    return;
  }

  if (!category) {
    showFormMessage("Product category is required.", "error");
    return;
  }

  if (file) {
    if (!file.type.startsWith("image/")) {
      showFormMessage("Please select an image file.", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showFormMessage("Image must be 5MB or smaller.", "error");
      return;
    }
  }

  saveButton.disabled = true;
  saveButton.textContent = editingProduct
    ? "Updating..."
    : "Saving...";

  try {
    let imageUrl = editingProduct
      ? editingProduct.image_url
      : null;

    if (file) {
      imageUrl = await uploadProductImage(file);
    }

    const productData = {
      name,
      price,
      category,
      description,
      image_url: imageUrl,
      available
    };

    if (editingProduct) {
      const { error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", editingProduct.id);

      if (error) {
        throw error;
      }

      showFormMessage(
        "Product updated successfully.",
        "success"
      );

    } else {
      const { error } = await supabase
        .from("products")
        .insert(productData);

      if (error) {
        throw error;
      }

      showFormMessage(
        "Product added successfully.",
        "success"
      );
    }

    await loadAdminProducts();

    setTimeout(() => {
      resetProductForm();
    }, 700);

  } catch (error) {
    console.error(error);

    showFormMessage(
      error.message || "Could not save the product.",
      "error"
    );

  } finally {
    saveButton.disabled = false;
    saveButton.textContent = editingProduct
      ? "Update Product"
      : "Save Product";
  }
}


async function uploadProductImage(file) {
  const extension =
    file.name.split(".").pop().toLowerCase() || "jpg";

  const safeName =
    file.name
      .replace(/\.[^/.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "product";

  const uniqueName =
    `${Date.now()}-${safeName}.${extension}`;

  const filePath = `products/${uniqueName}`;

  const { error } = await supabase.storage
    .from("product-images")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type
    });

  if (error) {
    throw error;
  }

  const {
    data: publicUrlData
  } = supabase.storage
    .from("product-images")
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}


async function toggleProduct(id) {
  const { data: product, error: findError } = await supabase
    .from("products")
    .select("available")
    .eq("id", id)
    .single();

  if (findError) {
    alert("Could not find the product.");
    return;
  }

  const { error } = await supabase
    .from("products")
    .update({
      available: !product.available
    })
    .eq("id", id);

  if (error) {
    alert("Could not update product visibility.");
    console.error(error);
    return;
  }

  await loadAdminProducts();
}


async function deleteProduct(id) {
  const confirmed = confirm(
    "Delete this product permanently?"
  );

  if (!confirmed) {
    return;
  }

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Could not delete the product.");
    console.error(error);
    return;
  }

  if (
    editingProduct &&
    Number(editingProduct.id) === Number(id)
  ) {
    resetProductForm();
  }

  await loadAdminProducts();
}


function resetProductForm() {
  editingProduct = null;

  productForm.reset();

  productId.value = "";

  productAvailable.checked = true;

  formTitle.textContent = "Add Product";
  saveButton.textContent = "Save Product";

  cancelEditButton.classList.add("hidden");

  imagePreview.classList.add("hidden");
  imagePreview.innerHTML = "";

  clearFormMessage();
}


function previewSelectedImage() {
  const file = productImage.files[0];

  if (!file) {
    if (editingProduct && editingProduct.image_url) {
      imagePreview.innerHTML = `
        <img
          src="${escapeHtml(editingProduct.image_url)}"
          alt="Current product image"
        >
      `;

      imagePreview.classList.remove("hidden");
    } else {
      imagePreview.classList.add("hidden");
      imagePreview.innerHTML = "";
    }

    return;
  }

  const reader = new FileReader();

  reader.onload = event => {
    imagePreview.innerHTML = `
      <img
        src="${event.target.result}"
        alt="Image preview"
      >
    `;

    imagePreview.classList.remove("hidden");
  };

  reader.readAsDataURL(file);
}


function showFormMessage(message, type) {
  formMessage.textContent = message;
  formMessage.className = `message ${type}`;
}


function clearFormMessage() {
  formMessage.textContent = "";
  formMessage.className = "message";
}


function formatPrice(value) {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return "KSh 0";
  }

  return `KSh ${number.toLocaleString("en-KE")}`;
}


function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
      }
