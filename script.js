// Firebase SDK Version 10 Modular Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Configuration
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
let currentViewMode = 'all'; // 'all' | 'saved' | 'my'
let activeLightboxPhoto = null;

// Local Stored Lists
let savedPhotoIds = JSON.parse(localStorage.getItem('openpichub_saved') || '[]');
let likedPhotoIds = JSON.parse(localStorage.getItem('openpichub_liked') || '[]');

const categories = ['All', 'Nature', 'Architecture', 'Technology', 'Animals', 'Travel'];

// Initial setup
renderCategories();
updateSavedBadge();

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
    if (currentViewMode === 'my') renderGallery();
});

// Real-time Cloud Firestore Sync
try {
    const photosQuery = query(collection(db, "photos"), orderBy("createdAt", "desc"));
    onSnapshot(photosQuery, (snapshot) => {
        photos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderGallery();
        if (activeLightboxPhoto) {
            const updated = photos.find(p => p.id === activeLightboxPhoto.id);
            if (updated) updateLightboxUI(updated);
        }
    }, (error) => {
        console.error("Firestore read error:", error);
    });
} catch (e) {
    console.error("Initialization error:", e);
}

// Dark / Light Theme Toggle
window.toggleTheme = () => {
    const html = document.documentElement;
    const isDark = html.classList.contains('dark');
    if (isDark) {
        html.classList.remove('dark');
        localStorage.setItem('openpichub_theme', 'light');
        updateThemeIcons('light');
    } else {
        html.classList.add('dark');
        localStorage.setItem('openpichub_theme', 'dark');
        updateThemeIcons('dark');
    }
};

function updateThemeIcons(theme) {
    const icon = document.getElementById('themeIcon');
    const mobileIcon = document.getElementById('themeIconMobile');
    if (icon) icon.className = theme === 'dark' ? 'fas fa-sun text-yellow-400' : 'fas fa-moon text-slate-700';
    if (mobileIcon) mobileIcon.className = theme === 'dark' ? 'fas fa-sun text-yellow-400' : 'fas fa-moon text-slate-700';
}

if (localStorage.getItem('openpichub_theme') === 'light') {
    document.documentElement.classList.remove('dark');
    updateThemeIcons('light');
}

// View Mode Switching ('all', 'saved', 'my')
window.setViewMode = (mode) => {
    if (mode === 'my' && !currentUser) {
        showToast("Please log in to view your uploaded photos", "error");
        window.openAuthModal('login');
        return;
    }
    if (mode === 'saved' && !currentUser) {
        showToast("Please log in to view saved photos", "error");
        window.openAuthModal('login');
        return;
    }

    currentViewMode = mode;
    
    ['all', 'saved', 'my'].forEach(m => {
        const btn = document.getElementById(`viewTab${m.charAt(0).toUpperCase() + m.slice(1)}`);
        if (btn) {
            if (m === mode) {
                btn.className = "px-4 py-2 rounded-xl bg-brand-600 text-white font-semibold transition-all shadow-sm";
            } else {
                btn.className = "px-4 py-2 rounded-xl bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all font-semibold";
            }
        }
    });

    const hero = document.getElementById('heroSection');
    const catSection = document.getElementById('categorySection');
    const subtitle = document.getElementById('gallerySubtitle');
    const title = document.getElementById('galleryTitle');

    if (mode === 'all') {
        if (hero) hero.classList.remove('hidden');
        if (catSection) catSection.classList.remove('hidden');
        if (title) title.textContent = "Community Photos";
        if (subtitle) subtitle.textContent = "Live images stored in Firebase Cloud Database";
    } else {
        if (hero) hero.classList.add('hidden');
        if (catSection) catSection.classList.add('hidden');
        if (title) title.textContent = mode === 'saved' ? "Your Saved Favorites" : "My Uploaded Photos";
        if (subtitle) subtitle.textContent = mode === 'saved' ? "Photos saved in your collection" : "Photos uploaded by your account";
    }

    renderGallery();
};

// 🔖 Toggle Save Favorite Photo (Requires Account)
window.toggleSavePhoto = (e, photoId) => {
    if (e) e.stopPropagation();

    if (!currentUser) {
        showToast("Please log in first to save favorite photos!", "error");
        window.openAuthModal('login');
        return;
    }

    if (savedPhotoIds.includes(photoId)) {
        savedPhotoIds = savedPhotoIds.filter(id => id !== photoId);
        showToast("Removed from saved favorites");
    } else {
        savedPhotoIds.push(photoId);
        showToast("Added to saved favorites! 🔖");
    }

    localStorage.setItem('openpichub_saved', JSON.stringify(savedPhotoIds));
    updateSavedBadge();
    renderGallery();
};

function updateSavedBadge() {
    const badge = document.getElementById('savedCount');
    if (badge) badge.textContent = savedPhotoIds.length;
}

// ❤️ Like / Unlike Photo (Anyone can like once - Toggle logic)
window.likePhoto = async (e, photoId) => {
    if (e) e.stopPropagation();

    const photoRef = doc(db, "photos", photoId);
    const isAlreadyLiked = likedPhotoIds.includes(photoId);

    try {
        if (isAlreadyLiked) {
            await updateDoc(photoRef, {
                likes: increment(-1)
            });
            likedPhotoIds = likedPhotoIds.filter(id => id !== photoId);
            showToast("Unliked photo");
        } else {
            await updateDoc(photoRef, {
                likes: increment(1)
            });
            likedPhotoIds.push(photoId);
            showToast("Liked photo! ❤️");
        }

        localStorage.setItem('openpichub_liked', JSON.stringify(likedPhotoIds));
        renderGallery();
    } catch (err) {
        console.error("Like error:", err);
        showToast("Failed to update like", "error");
    }
};

// Delete Photo (For owner)
window.deletePhoto = async (e, photoId) => {
    if (e) e.stopPropagation();
    if (!confirm("Are you sure you want to delete this photo permanently?")) return;
    try {
        await deleteDoc(doc(db, "photos", photoId));
        showToast("Photo deleted successfully!");
    } catch (err) {
        showToast("Failed to delete photo", "error");
    }
};

// Full-Screen Lightbox Modal Logic
window.openLightbox = async (photoId) => {
    const photo = photos.find(p => p.id === photoId);
    if (!photo) return;
    activeLightboxPhoto = photo;

    try {
        const photoRef = doc(db, "photos", photoId);
        await updateDoc(photoRef, { views: increment(1) });
    } catch (err) { console.error(err); }

    updateLightboxUI(photo);
    document.getElementById('lightboxModal').classList.remove('hidden');
};

function updateLightboxUI(photo) {
    const isLiked = likedPhotoIds.includes(photo.id);

    document.getElementById('lightboxImage').src = photo.url;
    document.getElementById('lightboxTitle').textContent = photo.title || 'Untitled';
    document.getElementById('lightboxCategory').textContent = photo.category || 'General';
    document.getElementById('lightboxUploader').textContent = photo.uploader ? photo.uploader.name : 'Anonymous';
    document.getElementById('lightboxAvatar').textContent = photo.uploader ? photo.uploader.name.charAt(0).toUpperCase() : 'A';
    document.getElementById('lightboxDate').textContent = photo.createdAt ? new Date(photo.createdAt).toLocaleDateString() : 'Recently';

    document.getElementById('lightboxViews').textContent = photo.views || 1;
    document.getElementById('lightboxLikes').textContent = photo.likes || 0;
    document.getElementById('lightboxDownloads').textContent = photo.downloads || 0;

    const likeBtn = document.getElementById('lightboxLikeBtn');
    likeBtn.innerHTML = `<i class="${isLiked ? 'fas' : 'far'} fa-heart text-red-500"></i><span>${isLiked ? 'Liked' : 'Like'}</span>`;
    likeBtn.onclick = (e) => window.likePhoto(e, photo.id);

    const saveBtn = document.getElementById('lightboxSaveBtn');
    saveBtn.onclick = (e) => window.toggleSavePhoto(e, photo.id);

    const downloadBtn = document.getElementById('lightboxDownloadBtn');
    downloadBtn.onclick = () => window.downloadPhoto(photo.url, photo.title, photo.id);
}

window.closeLightbox = () => {
    document.getElementById('lightboxModal').classList.add('hidden');
    activeLightboxPhoto = null;
};

// Download Photo & Increment Counter
window.downloadPhoto = async (url, title, photoId) => {
    try {
        showToast("Downloading photo...");
        const fileName = (title || 'photo').toLowerCase().replace(/[^a-z0-9]/g, '_') + '.jpg';

        if (photoId) {
            try {
                await updateDoc(doc(db, "photos", photoId), { downloads: increment(1) });
            } catch (e) { console.error(e); }
        }

        if (url.startsWith('data:')) {
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
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
        window.open(url, '_blank');
    }
};

// Auth Modal Management
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

// Upload Modal Logic
window.handleUploadClick = () => {
    if (!currentUser) {
        showToast("Please log in first to upload photos", "error");
        window.openAuthModal('login');
        return;
    }
    document.getElementById('uploadModal').classList.remove('hidden');
};

window.closeUploadModal = () => document.getElementById('uploadModal').classList.add('hidden');

function fileToBase64WithProgress(file, onProgress) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onprogress = (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 50);
                onProgress(percent);
            }
        };
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            onProgress(75);
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
                onProgress(100);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (error) => reject(error);
    });
}

window.handleUploadSubmit = async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('uploadFileInput');
    const urlInput = document.getElementById('uploadUrl').value.trim();
    const title = document.getElementById('uploadTitle').value;
    const category = document.getElementById('uploadCategory').value;
    const submitBtn = document.getElementById('uploadSubmitBtn');

    const progressContainer = document.getElementById('uploadProgressContainer');
    const progressBar = document.getElementById('uploadProgressBar');
    const progressText = document.getElementById('uploadProgressText');

    let finalImageUrl = '';

    try {
        submitBtn.disabled = true;
        progressContainer.classList.remove('hidden');

        const updateProgress = (pct) => {
            progressBar.style.width = `${pct}%`;
            progressText.textContent = `${pct}%`;
        };

        if (fileInput.files && fileInput.files[0]) {
            finalImageUrl = await fileToBase64WithProgress(fileInput.files[0], updateProgress);
        } else if (urlInput !== '') {
            updateProgress(100);
            finalImageUrl = urlInput;
        } else {
            showToast("Please choose an image file or provide a URL", "error");
            submitBtn.disabled = false;
            progressContainer.classList.add('hidden');
            return;
        }

        await addDoc(collection(db, "photos"), {
            title,
            url: finalImageUrl,
            category,
            views: 0,
            likes: 0,
            downloads: 0,
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
        progressContainer.classList.add('hidden');
        progressBar.style.width = '0%';
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

function renderCategories() {
    const container = document.getElementById('categoryContainer');
    if (!container) return;
    container.innerHTML = categories.map(cat => `
        <button onclick="window.selectCategory('${cat}')" 
            class="px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                activeCategory === cat 
                ? 'bg-brand-600 text-white font-semibold shadow-md shadow-brand-500/20' 
                : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
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
                <span class="text-xs font-semibold text-slate-800 dark:text-white">${currentUser.name}</span>
                <button onclick="window.logout()" class="text-xs text-red-500 hover:text-red-400 font-medium">Logout</button>
            </div>
        `;
    } else {
        container.innerHTML = `
            <button onclick="window.openAuthModal('login')" class="text-slate-700 dark:text-slate-300 hover:text-brand-500 text-sm font-medium px-3 py-2 rounded-lg">Log In</button>
            <button onclick="window.openAuthModal('signup')" class="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-sm font-medium px-4 py-2 rounded-full border border-slate-300 dark:border-slate-700">Sign Up</button>
        `;
    }
}

function renderGallery() {
    const grid = document.getElementById('galleryGrid');
    const photoCountBadge = document.getElementById('photoCountBadge');
    if (!grid) return;

    let filtered = photos.filter(photo => {
        if (currentViewMode === 'saved') {
            return savedPhotoIds.includes(photo.id);
        }
        if (currentViewMode === 'my') {
            return currentUser && photo.uploader && photo.uploader.uid === currentUser.uid;
        }
        const matchesCategory = activeCategory === 'All' || photo.category === activeCategory;
        const matchesSearch = searchQuery === '' || (photo.title && photo.title.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    if (photoCountBadge) {
        photoCountBadge.textContent = `${filtered.length} photos`;
    }

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-16 text-slate-400">
                <i class="fas fa-image text-4xl mb-3"></i>
                <p class="text-base font-medium">No photos found in this view.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(photo => {
        const isSaved = savedPhotoIds.includes(photo.id);
        const isLiked = likedPhotoIds.includes(photo.id);
        const isOwner = currentUser && photo.uploader && photo.uploader.uid === currentUser.uid;

        return `
        <div onclick="window.openLightbox('${photo.id}')" class="group cursor-pointer rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 relative">
            
            <!-- Quick Overlay Action Buttons -->
            <div class="absolute top-3 right-3 z-20 flex items-center space-x-2">
                <button onclick="window.toggleSavePhoto(event, '${photo.id}')" class="p-2.5 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white backdrop-blur-md transition-colors shadow">
                    <i class="${isSaved ? 'fas text-yellow-400' : 'far'} fa-bookmark"></i>
                </button>
                ${isOwner ? `
                    <button onclick="window.deletePhoto(event, '${photo.id}')" class="p-2.5 rounded-full bg-red-600/80 hover:bg-red-600 text-white backdrop-blur-md transition-colors shadow" title="Delete Photo">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                ` : ''}
            </div>

            <div class="relative h-72 w-full overflow-hidden bg-slate-900">
                <img src="${photo.url}" alt="${photo.title}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onerror="this.src='https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=600&q=80'">
            </div>
            
            <div class="p-4 space-y-3">
                <div class="flex items-center justify-between">
                    <h3 class="text-base font-bold text-slate-900 dark:text-white leading-snug truncate pr-2">${photo.title || 'Untitled'}</h3>
                    <button onclick="event.stopPropagation(); window.downloadPhoto('${photo.url}', '${photo.title || 'photo'}', '${photo.id}')" title="Download Photo" class="bg-brand-600 hover:bg-brand-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-md">
                        <i class="fas fa-download"></i>
                        <span>Free</span>
                    </button>
                </div>

                <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700/50">
                    <span class="text-brand-600 dark:text-brand-400 font-semibold">${photo.category || 'General'}</span>
                    <div class="flex items-center space-x-3">
                        <button onclick="window.likePhoto(event, '${photo.id}')" class="hover:text-red-500 transition-colors flex items-center space-x-1">
                            <i class="${isLiked ? 'fas text-red-500' : 'far text-red-500'} fa-heart"></i>
                            <span class="${isLiked ? 'font-bold text-red-500' : ''}">${photo.likes || 0}</span>
                        </button>
                        <span><i class="fas fa-eye text-slate-400 mr-1"></i>${photo.views || 0}</span>
                    </div>
                </div>
            </div>
        </div>
    `}).join('');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toast-message');
    if (!toast || !msgEl) return;
    
    msgEl.textContent = message;
    toast.classList.remove('translate-x-full', 'opacity-0');
    setTimeout(() => toast.classList.add('translate-x-full', 'opacity-0'), 3000);
}