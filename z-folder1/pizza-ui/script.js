const pizzaData = [
    { 
        id: 1,
        name: 'Classic Margherita', 
        image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?ixid=MnwxMjA3fDB8MHxzZWFyY2h8NXx8cGl6emF8ZW58MHx8MHx8&auto=format&fit=crop&w=500&q=60', 
        ingredients: 'San Marzano Tomato Sauce, Fresh Mozzarella, Basil, Extra Virgin Olive Oil', 
        price: 14.99 
    },
    { 
        id: 2,
        name: 'Pepperoni Feast', 
        image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?ixid=MnwxMjA3fDB8MHxzZWFyY2h8MTh8fHBpenphfGVufDB8MHwwfHw%3D&auto=format&fit=crop&w=500&q=60', 
        ingredients: 'Double Pepperoni, Mozzarella, Parmesan, Tomato Sauce', 
        price: 16.99 
    },
    { 
        id: 3,
        name: 'Veggie Supreme', 
        image: 'https://images.unsplash.com/photo-1511688878353-3a2f5be94cd7?ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8dmVnZ2llJTIwcGl6emF8ZW58MHx8MHx8&auto=format&fit=crop&w=500&q=60', 
        ingredients: 'Bell Peppers, Onions, Mushrooms, Black Olives, Cherry Tomatoes', 
        price: 15.99 
    },
    { 
        id: 4,
        name: 'BBQ Chicken', 
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixid=MnwxMjA3fDB8MHxzZWFyY2h8Nnx8cGl6emF8ZW58MHx8MHx8&auto=format&fit=crop&w=500&q=60', 
        ingredients: 'Grilled Chicken, Red Onions, Cilantro, BBQ Sauce Base', 
        price: 17.99 
    }
];

const gridContainer = document.getElementById('grid-container');
const cartSidebar = document.getElementById('cart-sidebar');
const cartToggleBtn = document.getElementById('cart-toggle');
const closeCartBtn = document.getElementById('close-cart');
const cartItemsContainer = document.getElementById('cart-items');
const cartCounter = document.getElementById('cart-counter');
const checkoutBtn = document.getElementById('checkout');
const checkoutModal = document.getElementById('checkout-modal');
const closeModalBtn = document.getElementById('close-modal');

let cart = [];

// Initialize Menu
function renderPizzaCards() {
    pizzaData.forEach(pizza => {
        const card = document.createElement('div');
        card.classList.add('pizza-card');

        card.innerHTML = `
            <img src="${pizza.image}" alt="${pizza.name}">
            <div class="pizza-content">
                <h3>${pizza.name}</h3>
                <p>${pizza.ingredients}</p>
                <div class="pizza-footer">
                    <span class="price">$${pizza.price.toFixed(2)}</span>
                    <button data-id="${pizza.id}" class="add-to-cart-btn">Add to Cart</button>
                </div>
            </div>
        `;
        gridContainer.appendChild(card);
    });
}

// Cart Toggle Logic
cartToggleBtn.addEventListener('click', () => {
    cartSidebar.classList.add('open');
});

closeCartBtn.addEventListener('click', () => {
    cartSidebar.classList.remove('open');
});

// Add to Cart Logic
gridContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('add-to-cart-btn')) {
        const pizzaId = parseInt(e.target.dataset.id);
        const pizza = pizzaData.find(p => p.id === pizzaId);
        addToCart(pizza);
        
        // Visual feedback
        const originalText = e.target.innerText;
        e.target.innerText = 'Added!';
        e.target.style.backgroundColor = '#2ed573';
        setTimeout(() => {
            e.target.innerText = originalText;
            e.target.style.backgroundColor = '';
        }, 1000);
    }
});

function addToCart(pizza) {
    cart.push(pizza);
    updateCartUI();
    cartSidebar.classList.add('open'); // Auto open cart
}

function updateCartUI() {
    // Update count
    cartCounter.innerText = cart.length;
    
    // Render items
    cartItemsContainer.innerHTML = '';
    let total = 0;
    
    cart.forEach((item, index) => {
        total += item.price;
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="cart-item-info">
                <h4>${item.name}</h4>
            </div>
            <div class="cart-item-price">$${item.price.toFixed(2)}</div>
        `;
        cartItemsContainer.appendChild(li);
    });
    
    // Update total
    checkoutBtn.innerText = `Checkout ($${total.toFixed(2)})`;
    checkoutBtn.disabled = cart.length === 0;
}

// Checkout Logic
checkoutBtn.addEventListener('click', () => {
    if (cart.length > 0) {
        cartSidebar.classList.remove('open');
        checkoutModal.classList.add('show');
        cart = []; // Empty cart
        updateCartUI();
    }
});

closeModalBtn.addEventListener('click', () => {
    checkoutModal.classList.remove('show');
});

// Init
document.addEventListener('DOMContentLoaded', () => {
    renderPizzaCards();
    updateCartUI();
});
