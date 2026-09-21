// --- Initial Mock Data ---
const initialPhotos = [
    {
        id: '1',
        title: 'Emerald Forest Mist',
        url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80',
        category: 'Nature',
        tags: ['forest', 'trees', 'mist', 'green'],
        uploader: { name: 'Sarah Jenkins', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80' },
        likes: 142,
        downloads: 890,
        views: 2310,
        liked: false
    },
    {
        id: '2',
        title: 'Modern Architecture Glass',
        url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
        category: 'Architecture',
        tags: ['building', 'skyscraper', 'modern', 'glass'],
        uploader: { name: 'David Chen', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80' },
        likes: 98,
        downloads: 412,
        views: 1150,
        liked: false
    },
    {
        id: '3',
        title: 'Cyberpunk Neon Setup',
        url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
        category: 'Technology',
        tags: ['retro', 'neon', 'computer', 'tech'],
        uploader: { name: 'Alex Rivera', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80' },
        likes: 310,
        downloads: 1420,
        views: 4500,
        liked: false
    },
    {
        id: '4',
        title: 'Majestic Lion Portrait',
        url: 'https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?auto=format&fit=crop&w=1200&q=80',
        category: 'Animals',
        tags: ['lion', 'wildlife', 'safari', 'cat'],
        uploader: { name: 'Elena Rostova', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80' },
        likes: 275,
        downloads: 980,
        views: 3100,
        liked: false
    },
    {
        id: '5',
        title: 'Minimalist Office Workspace',
        url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
        category: 'Business',
        tags: ['office', 'desk', 'workspace', 'clean'],
        uploader: { name: 'Marcus Vance', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=100&q=80' },
        likes: 184,
        downloads: 670,
        views: 2190,
        liked: false
    },
    {
        id: '6',
        title: 'Artisanal Coffee & Croissant',
        url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80',
        category: 'Food',
        tags: ['coffee', 'breakfast', 'bakery'],
        uploader: { name: 'Chloe Dubois', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=100&q=80' },
        likes: 215,
        downloads: 890,
        views: 2900,
        liked: false
    }
];

const categories = ['All', 'Nature', 'Architecture', 'Technology', 'Animals', 'Business', 'Food', 'Travel'];

// State
let photos = [];
let currentUser = null;
let activeCategory = 'All';
let searchQuery = '';
let activePhotoDetail = null;

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    loadLocalStorageData();
    renderCategories();
    renderGallery();
    updateAuthUI();
    setupSearchListeners();
}

// Local Storage Setup
function loadLocalStorageData() {
    const savedPhotos = localStorage.getItem('openpichub_photos');
    if (savedPhotos) {
        photos = JSON.parse(savedPhotos);
    } else {
        photos = [...initialPhotos];
        savePhotosToStorage();
    }

    const savedUser = localStorage.getItem('openpichub_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    }
}

function savePhotosToStorage() {
    localStorage.setItem('openpichub_photos', JSON.stringify(photos));
}

// Render Categories Bar
function renderCategories() {
    const container = document.getElementById('categoryContainer');
    container.innerHTML = categories.map(cat => `
        <button onclick="selectCategory('${cat}')" 
            class="px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                activeCategory === cat 
                ? 'bg-brand-600 text-white font-semibold shadow-md shadow-brand-500/20' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }">
            ${cat}
        </button>
    `).join('');
}

function selectCategory(cat) {
    activeCategory = cat;
    renderCategories();
    renderGallery();
}

// Render Gallery Grid
function renderGallery() {
    const grid = document.getElementById('galleryGrid');
    const emptyState = document.getElementById('emptyState');
    const photoCountBadge = document.getElementById('photoCountBadge');
    
    let filtered = photos.filter(photo => {
        const matchesCategory = activeCategory === 'All' || photo.category === activeCategory;
        const matchesSearch = searchQuery === '' || 
            photo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            photo.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    photoCountBadge.textContent = `${filtered.length} photos`;

    if (filtered.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    
    grid.innerHTML = filtered.map(photo => `
        <div class="group relative rounded-2xl overflow-hidden bg-slate-800 border border-slate-800 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-brand-500/10 cursor-pointer">
            <img src="${photo.url}" alt="${photo.title}" class="w-full h-72 object-cover transition-transform duration-500 group-hover:scale-105" onclick="openPhotoModal('${photo.id}')">
            
            <div class="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4 pointer-events-none">
                
                <div class="flex justify-end pointer-events-auto">
                    <button onclick="toggleLike(event, '${photo.id}')" class="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-md transition-colors">
                        <i class="${photo.liked ? 'fas text-red-500' : 'far text-white'} fa-heart"></i>
                    </button>
                </div>

                <div class="space-y-2 pointer-events-auto" onclick="openPhotoModal('${photo.id}')">
                    <h3 class="text-base font-bold text-white leading-snug line-clamp-1">${photo.title}</h3>
                    
                    <div class="flex items-center justify-between pt-1">
                        <div class="flex items-center space-x-2">
                            <img src="${photo.uploader.avatar}" class="w-6 h-6 rounded-full object-cover border border-slate-600">
                            <span class="text-xs text-slate-300 font-medium">${photo.uploader.name}</span>
                        </div>
                        <a href="${photo.url}" target="_blank" download onclick="event.stopPropagation(); trackDownload('${photo.id}');" class="p-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs">
                            <i class="fas fa-download"></i>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Search Functionality
function setupSearchListeners() {
    const headerInput = document.getElementById('headerSearchInput');
    const heroInput = document.getElementById('heroSearchInput');
    const mobileInput = document.getElementById('mobileSearchInput');

    const handleInput = (e) => {
        searchQuery = e.target.value;
        document.getElementById('galleryTitle').textContent = searchQuery ? `Search: "${searchQuery}"` : 'Featured Photography';
        renderGallery();
    };

    if (headerInput) headerInput.addEventListener('input', handleInput);
    if (heroInput) heroInput.addEventListener('input', handleInput);
    if (mobileInput) mobileInput.addEventListener('input', handleInput);
}

function triggerSearch(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        searchQuery = input.value;
        renderGallery();
    }
}

function setCategorySearch(cat) {
    selectCategory(cat);
}

function resetView() {
    searchQuery = '';
    activeCategory = 'All';
    document.getElementById('headerSearchInput').value = '';
    document.getElementById('heroSearchInput').value = '';
    document.getElementById('galleryTitle').textContent = 'Featured Photography';
    renderCategories();
    renderGallery();
}

// Like functionality
function toggleLike(e, id) {
    if (e) e.stopPropagation();
    const photo = photos.find(p => p.id === id);
    if (photo) {
        photo.liked = !photo.liked;
        photo.likes += photo.liked ? 1 : -1;
        savePhotosToStorage();
        renderGallery();
        showToast(photo.liked ? 'Saved to Liked Photos' : 'Removed from Liked Photos');
    }
}

function trackDownload(id) {
    const photo = photos.find(p => p.id === id);
    if (photo) {
        photo.downloads += 1;
        savePhotosToStorage();
    }
}

// Modals Trigger & Logic
function openAuthModal(tab = 'login') {
    switchAuthTab(tab);
    const modal = document.getElementById('authModal');
    const container = document.getElementById('authModalContainer');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        container.classList.remove('scale-95');
    }, 10);
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    const container = document.getElementById('authModalContainer');
    modal.classList.add('opacity-0');
    container.classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 200);
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const tabLogin = document.getElementById('tabLogin');
    const tabSignup = document.getElementById('tabSignup');

    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
        tabLogin.className = 'flex-1 pb-3 text-center text-sm font-semibold text-brand-500 border-b-2 border-brand-500';
        tabSignup.className = 'flex-1 pb-3 text-center text-sm font-semibold text-slate-400 border-b-2 border-transparent';
    } else {
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
        tabSignup.className = 'flex-1 pb-3 text-center text-sm font-semibold text-brand-500 border-b-2 border-brand-500';
        tabLogin.className = 'flex-1 pb-3 text-center text-sm font-semibold text-slate-400 border-b-2 border-transparent';
    }
}

function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    currentUser = {
        name: email.split('@')[0],
        email: email,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'
    };
    localStorage.setItem('openpichub_user', JSON.stringify(currentUser));
    updateAuthUI();
    closeAuthModal();
    showToast(`Welcome back, ${currentUser.name}!`);
}

function handleSignupSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    currentUser = {
        name: name,
        email: email,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'
    };
    localStorage.setItem('openpichub_user', JSON.stringify(currentUser));
    updateAuthUI();
    closeAuthModal();
    showToast(`Account created! Welcome, ${currentUser.name}`);
}

function logout() {
    currentUser = null;
    localStorage.removeItem('openpichub_user');
    updateAuthUI();
    showToast('Logged out successfully');
}

function updateAuthUI() {
    const container = document.getElementById('authNavContainer');
    if (currentUser) {
        container.innerHTML = `
            <div class="flex items-center space-x-3">
                <img src="${currentUser.avatar}" class="w-8 h-8 rounded-full object-cover border border-brand-500">
                <span class="text-xs font-semibold text-white">${currentUser.name}</span>
                <button onclick="logout()" class="text-xs text-slate-400 hover:text-red-400 transition-colors ml-2"><i class="fas fa-sign-out-alt"></i></button>
            </div>
        `;
    } else {
        container.innerHTML = `
            <button onclick="openAuthModal('login')" class="text-slate-300 hover:text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">Log In</button>
            <button onclick="openAuthModal('signup')" class="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-full border border-slate-700 transition-colors">Sign Up</button>
        `;
    }
}

// Protected Upload Modal
function handleUploadClick() {
    if (!currentUser) {
        showToast('Please Log In to upload photos', 'error');
        openAuthModal('login');
        return;
    }
    openUploadModal();
}

function openUploadModal() {
    const modal = document.getElementById('uploadModal');
    const container = document.getElementById('uploadModalContainer');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        container.classList.remove('scale-95');
    }, 10);
}

function closeUploadModal() {
    const modal = document.getElementById('uploadModal');
    const container = document.getElementById('uploadModalContainer');
    modal.classList.add('opacity-0');
    container.classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 200);
}

let uploadedDataUrl = '';

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            uploadedDataUrl = event.target.result;
            document.getElementById('dropzonePrompt').classList.add('hidden');
            document.getElementById('dropzonePreview').classList.remove('hidden');
            document.getElementById('previewImg').src = uploadedDataUrl;
        };
        reader.readAsDataURL(file);
    }
}

function handleUploadSubmit(e) {
    e.preventDefault();
    if (!uploadedDataUrl) {
        showToast('Please select an image file first', 'error');
        return;
    }

    const title = document.getElementById('uploadTitle').value;
    const category = document.getElementById('uploadCategory').value;
    const tagsInput = document.getElementById('uploadTags').value;
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()) : [category.toLowerCase()];

    const newPhoto = {
        id: Date.now().toString(),
        title: title,
        url: uploadedDataUrl,
        category: category,
        tags: tags,
        uploader: {
            name: currentUser.name,
            avatar: currentUser.avatar
        },
        likes: 0,
        downloads: 0,
        views: 1,
        liked: false
    };

    photos.unshift(newPhoto);
    savePhotosToStorage();
    renderGallery();
    closeUploadModal();
    showToast('Photo published successfully!');
    
    // Reset Form
    document.getElementById('uploadForm').reset();
    document.getElementById('dropzonePrompt').classList.remove('hidden');
    document.getElementById('dropzonePreview').classList.add('hidden');
    uploadedDataUrl = '';
}

// Photo Inspector Modal
function openPhotoModal(id) {
    const photo = photos.find(p => p.id === id);
    if (!photo) return;

    photo.views += 1;
    savePhotosToStorage();
    activePhotoDetail = photo;

    document.getElementById('detailImg').src = photo.url;
    document.getElementById('detailTitle').textContent = photo.title;
    document.getElementById('detailCategory').textContent = photo.category;
    document.getElementById('detailUploaderName').textContent = photo.uploader.name;
    document.getElementById('detailUploaderAvatar').src = photo.uploader.avatar;
    document.getElementById('detailViews').textContent = photo.views.toLocaleString();
    document.getElementById('detailDownloads').textContent = photo.downloads.toLocaleString();
    document.getElementById('detailDownloadBtn').href = photo.url;

    const tagsContainer = document.getElementById('detailTags');
    tagsContainer.innerHTML = photo.tags.map(tag => `
        <span class="bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded-md border border-slate-700">#${tag}</span>
    `).join('');

    const modal = document.getElementById('photoModal');
    const container = document.getElementById('photoModalContainer');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        container.classList.remove('scale-95');
    }, 10);
}

function closePhotoModal() {
    const modal = document.getElementById('photoModal');
    const container = document.getElementById('photoModalContainer');
    modal.classList.add('opacity-0');
    container.classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 200);
}

function toggleDetailLike() {
    if (activePhotoDetail) {
        toggleLike(null, activePhotoDetail.id);
        openPhotoModal(activePhotoDetail.id);
    }
}

// Toast Notifications
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');

    toastMsg.textContent = message;
    if (type === 'error') {
        toastIcon.className = 'fas fa-exclamation-circle text-red-500 text-lg';
    } else {
        toastIcon.className = 'fas fa-check-circle text-brand-500 text-lg';
    }

    toast.classList.remove('translate-x-full', 'opacity-0');
    setTimeout(() => {
        toast.classList.add('translate-x-full', 'opacity-0');
    }, 3000);
}