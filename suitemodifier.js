 import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
    import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc, arrayUnion } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

    const firebaseConfig = {
        apiKey: "AIzaSyCL0VrMAt9XNGgX1e0_HIEVC03teeOvqtY",
        authDomain: "marciojardel-ce0d5.firebaseapp.com",
        databaseURL: "https://marciojardel-ce0d5-default-rtdb.firebaseio.com",
        projectId: "marciojardel-ce0d5",
        storageBucket: "marciojardel-ce0d5.appspot.com",
        messagingSenderId: "313912737797",
        appId: "1:313912737797:web:72fee65438c79c86715c6c",
        measurementId: "G-YN957W0TE0"
    };

    // Configuration Cloudinary
    const cloudinaryConfig = {
        cloudName: 'djxcqczh1',
        uploadPreset: 'database'
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const introVideo = document.getElementById('introVideo');
    const skipButton = document.getElementById('skipButton');
    const registrationScreen = document.getElementById('registrationScreen');
    const welcomeScreen = document.getElementById('welcomeScreen');
    const chatContainer = document.getElementById('chatContainer');
    const registrationForm = document.getElementById('registrationForm');
    const messagesContainer = document.getElementById('messagesContainer');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const stickerButton = document.getElementById('stickerButton');
    const stickerPicker = document.getElementById('stickerPicker');
    const replyingBanner = document.getElementById('replyingBanner');
    const replyingText = document.getElementById('replyingText');
    const cancelReply = document.getElementById('cancelReply');
    const fileButton = document.getElementById('fileButton');
    const fileInput = document.getElementById('fileInput');
    const filePreview = document.getElementById('filePreview');
    const previewContent = document.getElementById('previewContent');
    const fileInfo = document.getElementById('fileInfo');
    const removeFile = document.getElementById('removeFile');
    const uploadingSpinner = document.getElementById('uploadingSpinner');
    const mediaModal = document.getElementById('mediaModal');
    const mediaModalContent = document.getElementById('mediaModalContent');
    const closeModal = document.getElementById('closeModal');

    let replyingToMessage = null;
    let lastMessageCount = 0;
    let selectedFile = null;
    let userId = null;

    // Générer un ID utilisateur unique
    function getUserId() {
        if (!userId) {
            userId = localStorage.getItem('templePecheUserId');
            if (!userId) {
                userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('templePecheUserId', userId);
            }
        }
        return userId;
    }

    // Créer les particules animées
    function createParticles() {
        const particlesContainer = document.getElementById('particles');
        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.width = Math.random() * 4 + 2 + 'px';
            particle.style.height = particle.style.width;
            particle.style.animationDelay = Math.random() * 5 + 's';
            particle.style.animationDuration = Math.random() * 3 + 3 + 's';
            particlesContainer.appendChild(particle);
        }
    }

    createParticles();

    setTimeout(() => {
        introVideo.classList.add('hidden');
        checkRegistration();
    }, 6000);

    skipButton.addEventListener('click', () => {
        introVideo.classList.add('hidden');
        checkRegistration();
    });

    function checkRegistration() {
        if (localStorage.getItem('templePecheRegistered')) {
            showChat();
        }
    }

    registrationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const phoneNumber = document.getElementById('phoneNumber').value;

        if (phoneNumber) {
            try {
                await addDoc(collection(db, 'users'), {
                    phone: phoneNumber,
                    userId: getUserId(),
                    joinedAt: serverTimestamp()
                });

                localStorage.setItem('templePecheRegistered', 'true');
                showWelcomeAnimation();
            } catch (error) {
                console.error('Erreur lors de l\'inscription:', error);
                alert('Erreur lors de l\'inscription. Veuillez réessayer.');
            }
        }
    });

    function showWelcomeAnimation() {
        registrationScreen.classList.add('hidden');
        welcomeScreen.classList.remove('hidden');

        setTimeout(() => {
            welcomeScreen.classList.add('hidden');
            showChat();
        }, 4000);
    }

    function showChat() {
        registrationScreen.classList.add('hidden');
        welcomeScreen.classList.add('hidden');
        chatContainer.classList.add('active');
        loadMessages();
    }

    // Gestion des fichiers
    fileButton.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            selectedFile = file;
            showFilePreview(file);
        }
    });

    function showFilePreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewContent.innerHTML = '';
            if (file.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = e.target.result;
                previewContent.appendChild(img);
            } else if (file.type.startsWith('video/')) {
                const video = document.createElement('video');
                video.src = e.target.result;
                video.controls = true;
                previewContent.appendChild(video);
            }
            fileInfo.textContent = `📎 ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
            filePreview.classList.add('active');
        };
        reader.readAsDataURL(file);
    }

    removeFile.addEventListener('click', () => {
        selectedFile = null;
        fileInput.value = '';
        filePreview.classList.remove('active');
        previewContent.innerHTML = '';
        fileInfo.textContent = '';
    });

    async function uploadToCloudinary(file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', cloudinaryConfig.uploadPreset);

        const resourceType = file.type.startsWith('video/') ? 'video' : 'image';
        const url = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/${resourceType}/upload`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();
            return {
                url: data.secure_url,
                type: resourceType,
                publicId: data.public_id
            };
        } catch (error) {
            console.error('Erreur upload Cloudinary:', error);
            throw error;
        }
    }

    // Gestion des stickers
    stickerButton.addEventListener('click', () => {
        stickerPicker.classList.toggle('active');
    });

    document.querySelectorAll('.sticker-item').forEach(item => {
        item.addEventListener('click', () => {
            messageInput.value += item.dataset.sticker;
            stickerPicker.classList.remove('active');
            messageInput.focus();
        });
    });

    cancelReply.addEventListener('click', () => {
        replyingToMessage = null;
        replyingBanner.classList.remove('active');
    });

    function loadMessages() {
        const q = query(collection(db, 'messages'), orderBy('timestamp', 'asc'));
        
        onSnapshot(q, (snapshot) => {
            const newCount = snapshot.size;
            const unreadCount = newCount - lastMessageCount;
            
            if (lastMessageCount > 0 && unreadCount > 0 && document.hidden) {
                showUnreadBadge(unreadCount);
            }
            
            lastMessageCount = newCount;
            messagesContainer.innerHTML = '';
            
            snapshot.forEach((doc) => {
                const message = doc.data();
                message.id = doc.id;
                displayMessage(message);
            });
            
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
    }

    function showUnreadBadge(count) {
        const badge = document.createElement('div');
        badge.className = 'unread-badge';
        badge.textContent = `${count} nouveau${count > 1 ? 'x' : ''} message${count > 1 ? 's' : ''}`;
        document.body.appendChild(badge);

        setTimeout(() => badge.remove(), 5000);
    }

    function displayMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        if (message.replyTo) {
            messageDiv.classList.add('reply');
        }
        
        const time = message.timestamp ? new Date(message.timestamp.toDate()).toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        }) : 'Maintenant';

        let replyHtml = '';
        if (message.replyTo) {
            replyHtml = `<div class="reply-to">↪ Réponse: ${escapeHtml(message.replyTo.substring(0, 50))}...</div>`;
        }

        let mediaHtml = '';
        if (message.media) {
            const currentUserId = getUserId();
            const hasViewed = message.viewedBy && message.viewedBy.includes(currentUserId);
            
            if (hasViewed) {
                mediaHtml = `
                    <div class="message-media">
                        <div class="media-viewed">
                            🔒 Média déjà consulté (vue unique)
                        </div>
                    </div>
                `;
            } else {
                mediaHtml = `
                    <div class="message-media">
                        <div class="media-container" data-media-url="${message.media.url}" data-media-type="${message.media.type}" data-message-id="${message.id}">
                            <div class="media-placeholder">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                    <polyline points="21 15 16 10 5 21"></polyline>
                                </svg>
                                <span>👁️ Cliquez pour voir (vue unique)</span>
                            </div>
                        </div>
                    </div>
                `;
            }
        }

        messageDiv.innerHTML = `
            <div class="message-header">
                <div class="avatar">👤</div>
                <span class="username">Anonyme</span>
                <span class="timestamp">${time}</span>
            </div>
            ${replyHtml}
            <div class="message-text">${escapeHtml(message.text)}</div>
            ${mediaHtml}
            <div class="reply-actions">
                <button class="btn-reply" data-message="${escapeHtml(message.text)}" data-id="${message.id}">↪ Répondre</button>
            </div>
        `;

        const replyBtn = messageDiv.querySelector('.btn-reply');
        replyBtn.addEventListener('click', () => {
            replyingToMessage = {
                id: message.id,
                text: message.text
            };
            replyingText.textContent = `Réponse à: ${message.text.substring(0, 50)}...`;
            replyingBanner.classList.add('active');
            messageInput.focus();
        });

        const mediaContainer = messageDiv.querySelector('.media-container');
        if (mediaContainer) {
            mediaContainer.addEventListener('click', async () => {
                const mediaUrl = mediaContainer.dataset.mediaUrl;
                const mediaType = mediaContainer.dataset.mediaType;
                const messageId = mediaContainer.dataset.messageId;

                // Marquer comme vu
                try {
                    const messageRef = doc(db, 'messages', messageId);
                    await updateDoc(messageRef, {
                        viewedBy: arrayUnion(getUserId())
                    });
                } catch (error) {
                    console.error('Erreur lors du marquage:', error);
                }

                // Afficher le média
                showMediaModal(mediaUrl, mediaType);
            });
        }

        messagesContainer.appendChild(messageDiv);
    }

    function showMediaModal(url, type) {
        mediaModalContent.innerHTML = '';
        
        if (type === 'image') {
            const img = document.createElement('img');
            img.src = url;
            mediaModalContent.appendChild(img);
        } else if (type === 'video') {
            const video = document.createElement('video');
            video.src = url;
            video.controls = true;
            video.autoplay = true;
            mediaModalContent.appendChild(video);
        }

        mediaModal.classList.add('active');
    }

    closeModal.addEventListener('click', () => {
        mediaModal.classList.remove('active');
        mediaModalContent.innerHTML = '';
    });

    mediaModal.addEventListener('click', (e) => {
        if (e.target === mediaModal) {
            mediaModal.classList.remove('active');
            mediaModalContent.innerHTML = '';
        }
    });

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async function sendMessage() {
        const text = messageInput.value.trim();
        
        if (text || selectedFile) {
            try {
                uploadingSpinner.classList.add('active');
                sendButton.disabled = true;

                const messageData = {
                    text: text || '📎 Fichier partagé',
                    timestamp: serverTimestamp(),
                    viewedBy: []
                };

                if (selectedFile) {
                    const uploadResult = await uploadToCloudinary(selectedFile);
                    messageData.media = uploadResult;
                }

                if (replyingToMessage) {
                    messageData.replyTo = replyingToMessage.text;
                    messageData.replyToId = replyingToMessage.id;
                }

                await addDoc(collection(db, 'messages'), messageData);

                messageInput.value = '';
                selectedFile = null;
                fileInput.value = '';
                filePreview.classList.remove('active');
                replyingToMessage = null;
                replyingBanner.classList.remove('active');
                uploadingSpinner.classList.remove('active');
                sendButton.disabled = false;
            } catch (error) {
                console.error('Erreur lors de l\'envoi:', error);
                alert('Erreur lors de l\'envoi du message. Veuillez réessayer.');
                uploadingSpinner.classList.remove('active');
                sendButton.disabled = false;
            }
        }
    }

    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            lastMessageCount = messagesContainer.children.length;
        }
    });
