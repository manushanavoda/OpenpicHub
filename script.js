// Firebase SDK Version 10 Modular Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAqXB2ttD6DWoywN4GSol93CZOSAKdBbwA",
  authDomain: "openpichub-ebb9a.firebaseapp.com",
  projectId: "openpichub-ebb9a",
  storageBucket: "openpichub-ebb9a.firebasestorage.app",
  messagingSenderId: "542177821598",
  appId: "1:542177821598:web:9349426ad6c4a45352cc8f",
  measurementId: "G-LGG5RDJ5K1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// App State
let currentUser = null;
let photos = [];
let activeCategory = 'All';
let searchQuery = '';

const categories = ['All', 'Nature', 'Architecture', 'Technology', 'Animals', 'Travel'];

// Initial Categories render
renderCategories();

// Listen to Global Auth State
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = {
            uid: user.uid,
            name: user.displayName || user.email.split('@')[0],
            email: user.email,
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'
        };
    } else {
        currentUser = null;
    }
    updateAuthUI();
});

// Real-time Cloud Firestore Photo Sync
try {
    const photosQuery = query(collection(db, "photos"), orderBy("createdAt", "desc"));
    onSnapshot(photosQuery, (snapshot) => {
        photos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderGallery();
    }, (error) => {
        console.error("Firestore read error:", error);
    });
} catch (e) {
    console.error("Initialization error:", e);
}

// Global functions attached to window for HTML onclick compatibility
window.openAuthModal = (tab) => {
    document.getElementById('authModal').classList.remove('hidden');
    window.switchAuthTab(tab);
};

window.closeAuthModal = () => document.getElementById('authModal').classList.add('hidden');

window.switchAuthTab = (tab) => {
    if (tab === 'login') {
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('signupForm').classList.add('hidden');
        document.getElementById('tabLogin').className = 'flex-1 pb-3 text-center text-sm font-semibold text-brand-500 border-b-2 border-brand-500';
        document.getElementById('tabSignup').className = 'flex-1 pb-3 text-center text-sm font-semibold text-slate-400 border-b-2 border-transparent';
    } else {
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('signupForm').classList.remove('hidden');
        document.getElementById('tabSignup').className = 'flex-1 pb-3 text-center text-sm font-semibold text-brand-500 border-b-2 border-brand-500';
        document.getElementById('tabLogin').className = 'flex-1 pb-3 text-center text-sm font-semibold text-slate-400 border-b-2 border-transparent';
    }
};

// Firebase Sign Up
window.handleSignupSubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        showToast("Account registered successfully!");
        window.closeAuthModal();
    } catch (error) {
        showToast(error.message, 'error');
    }
};

// Firebase Log In
window.handleLoginSubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast("Logged in successfully!");
        window.closeAuthModal();
    } catch (error) {
        showToast("Invalid credentials or login error", 'error');
    }
};

window.logout = () => {
    signOut(auth);
    showToast("Logged out!");
};

// Open/Close Upload Modal
window.handleUploadClick = () => {
    if (!currentUser) {
        showToast("Please log in first to upload photos", "error");
        window.openAuthModal('login');
        return;
    }
    document.getElementById('uploadModal').classList.remove('hidden');
};

window.closeUploadModal = () => document.getElementById('uploadModal').classList.add('hidden');

// Convert local File to resized Base64 for Firestore storage
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1200;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (error) => reject(error);
    });
}

// Firebase Global Photo Upload (File or URL)
window.handleUploadSubmit = async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('uploadFileInput');
    const urlInput = document.getElementById('uploadUrl').value.trim();
    const title = document.getElementById('uploadTitle').value;
    const category = document.getElementById('uploadCategory').value;
    const submitBtn = document.getElementById('uploadSubmitBtn');

    let finalImageUrl = '';

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span>Uploading...</span>`;

        if (fileInput.files && fileInput.files[0]) {
            finalImageUrl = await fileToBase64(fileInput.files[0]);
        } else if (urlInput !== '') {
            finalImageUrl = urlInput;
        } else {
            showToast("Please choose an image file or provide a URL", "error");
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fas fa-cloud-upload-alt"></i> <span>Upload Globally</span>`;
            return;
        }

        await addDoc(collection(db, "photos"), {
            title,
            url: finalImageUrl,
            category,
            uploader: {
                name: currentUser.name,
                avatar: currentUser.avatar,
                uid: currentUser.uid
            },
            createdAt: new Date().toISOString()
        });

        showToast("Photo saved to global cloud database!");
        window.closeUploadModal();
        document.getElementById('uploadForm').reset();
    } catch (error) {
        console.error(error);
        showToast("Failed to upload photo to database", 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fas fa-cloud-upload-alt"></i> <span>Upload Globally</span>`;
    }
};

// 📥 Photo Download Functionality
window.downloadPhoto = async (url, title) => {
    try {
        showToast("Downloading photo...");
        const fileName = (title || 'photo').toLowerCase().replace(/[^a-z0-9]/g, '_') + '.jpg';

        if (url.startsWith('data:')) {
            // Direct Base64 download
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            // URL Download via Blob
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        }
        showToast("Download completed!");
    } catch (err) {
        console.error(err);
        // Fallback open image in new tab if CORS prevents direct download
        window.open(url, '_blank');
    }
};

window.selectCategory = (cat) => {
    activeCategory = cat;
    renderCategories();
    renderGallery();
};

window.triggerSearch = (inputId) => {
    const input = document.getElementById(inputId);
    if (input) {
        searchQuery = input.value;
        renderGallery();
    }
};

window.resetView = () => {
    searchQuery = '';
    activeCategory = 'All';
    const headerInput = document.getElementById('headerSearchInput');
    const heroInput = document.getElementById('heroSearchInput');
    if (headerInput) headerInput.value = '';
    if (heroInput) heroInput.value = '';
    renderCategories();
    renderGallery();
};

function renderCategories() {
    const container = document.getElementById('categoryContainer');
    if (!container) return;
    container.innerHTML = categories.map(cat => `
        <button onclick="window.selectCategory('${cat}')" 
            class="px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                activeCategory === cat 
                ? 'bg-brand-600 text-white font-semibold shadow-md shadow-brand-500/20' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }">
            ${cat}
        </button>
    `).join('');
}

function updateAuthUI() {
    const container = document.getElementById('authNavContainer');
    if (!container) return;
    if (currentUser) {
        container.innerHTML = `
            <div class="flex items-center space-x-3">
                <span class="text-xs font-semibold text-white">${currentUser.name}</span>
                <button onclick="window.logout()" class="text-xs text-red-400 hover:text-red-300">Logout</button>
            </div>
        `;
    } else {
        container.innerHTML = `
            <button onclick="window.openAuthModal('login')" class="text-slate-300 hover:text-white text-sm">Log In</button>
            <button onclick="window.openAuthModal('signup')" class="bg-slate-800 hover:bg-slate-700 text-white text-sm px-4 py-2 rounded-full border border-slate-700">Sign Up</button>
        `;
    }
}

function renderGallery() {
    const grid = document.getElementById('galleryGrid');
    const photoCountBadge = document.getElementById('photoCountBadge');
    if (!grid) return;

    let filtered = photos.filter(photo => {
        const matchesCategory = activeCategory === 'All' || photo.category === activeCategory;
        const matchesSearch = searchQuery === '' || 
            (photo.title && photo.title.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    if (photoCountBadge) {
        photoCountBadge.textContent = `${filtered.length} photos live`;
    }

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-12 text-slate-500">
                <i class="fas fa-image text-3xl mb-2"></i>
                <p>No photos found in cloud database. Be the first to upload one!</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(photo => `
        <div class="group relative rounded-2xl overflow-hidden bg-slate-800 border border-slate-800 shadow-xl transition-transform hover:-translate-y-1">
            <img src="${photo.url}" alt="${photo.title}" class="w-full h-72 object-cover" onerror="this.src='https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=600&q=80'">
            
            <div class="p-4 space-y-2">
                <div class="flex items-center justify-between">
                    <h3 class="text-base font-bold text-white leading-snug truncate pr-2">${photo.title || 'Untitled'}</h3>
                    <!-- Download Button -->
                    <button onclick="window.downloadPhoto('${photo.url}', '${photo.title || 'photo'}')" title="Download Photo" class="bg-brand-600 hover:bg-brand-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-md">
                        <i class="fas fa-download"></i>
                        <span>Download</span>
                    </button>
                </div>
                <div class="flex items-center justify-between pt-1">
                    <span class="text-xs text-brand-400 font-medium">${photo.category || 'General'}</span>
                    <span class="text-xs text-slate-400">By ${photo.uploader ? photo.uploader.name : 'Anonymous'}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toast-message');
    if (!toast || !msgEl) return;
    
    msgEl.textContent = message;
    toast.classList.remove('translate-x-full', 'opacity-0');
    setTimeout(() => toast.classList.add('translate-x-full', 'opacity-0'), 3000);
}