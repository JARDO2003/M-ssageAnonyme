
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

    // Fonction pour vérifier et préparer la vidéo pour l'upload
    async function prepareVideoForUpload(file) {
        // Vérifier la taille du fichier (limiter à 100MB)
        const maxSize = 100 * 1024 * 1024; // 100MB
        
        if (file.size > maxSize) {
            throw new Error(`La vidéo est trop volumineuse (${(file.size / 1024 / 1024).toFixed(2)}MB). Limite: 100MB`);
        }
        
        // Formats acceptés
        const acceptedFormats = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/3gpp', 'video/3gpp2'];
        
        if (!acceptedFormats.includes(file.type) && !file.name.match(/\.(mp4|mov|avi|webm|3gp|3g2)$/i)) {
            throw new Error(`Format non supporté. Utilisez MP4, MOV, AVI, WebM ou 3GP.`);
        }
        
        return file;
    }

    // Upload vers Cloudinary avec gestion d'erreur améliorée
    async function uploadToCloudinary(file) {
        try {
            let fileToUpload = file;
            const resourceType = file.type.startsWith('video/') ? 'video' : 'image';
            
            // Préparation spéciale pour les vidéos
            if (resourceType === 'video') {
                fileToUpload = await prepareVideoForUpload(file);
            }
            
            const formData = new FormData();
            formData.append('file', fileToUpload);
            formData.append('upload_preset', cloudinaryConfig.uploadPreset);
            
            // Paramètres supplémentaires pour les vidéos
            if (resourceType === 'video') {
                formData.append('resource_type', 'video');
                formData.append('chunk_size', '6000000'); // 6MB chunks
                formData.append('quality', 'auto:good');
                formData.append('fetch_format', 'auto');
            }
            
            const url = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/${resourceType}/upload`;

            // Timeout plus long pour les vidéos
            const controller = new AbortController();
            const timeoutDuration = resourceType === 'video' ? 300000 : 60000; // 5min pour vidéo, 1min pour image
            const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

            const response = await fetch(url, {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `Erreur HTTP ${response.status}`);
            }

            const data = await response.json();
            return {
                url: data.secure_url,
                type: resourceType,
                publicId: data.public_id,
                format: data.format,
                duration: data.duration || null
            };
        } catch (error) {
            console.error('Erreur upload Cloudinary:', error);
            
            // Messages d'erreur plus clairs
            if (error.name === 'AbortError') {
                throw new Error('⏱️ Timeout: La vidéo est trop longue à uploader. Essayez une vidéo plus courte ou compressée.');
            } else if (error.message.includes('trop volumineuse')) {
                throw error;
            } else if (error.message.includes('Format non supporté')) {
                throw error;
            } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                throw new Error('❌ Erreur de connexion. Vérifiez votre internet et réessayez.');
            } else if (error.message.includes('413')) {
                throw new Error('❌ Fichier trop volumineux pour le serveur. Réduisez la taille de votre vidéo.');
            } else {
                throw new Error(`❌ Erreur d'upload: ${error.message}`);
            }
        }
    }

    // Gestion des fichiers
    fileButton.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            // Vérifier la taille avant de continuer
            const maxSize = 100 * 1024 * 1024; // 100MB
            
            if (file.size > maxSize) {
                alert(`⚠️ Fichier trop volumineux: ${(file.size / 1024 / 1024).toFixed(2)}MB\nTaille maximale: 100MB`);
                fileInput.value = '';
                return;
            }
            
            // Vérifier le format pour les vidéos
            if (file.type.startsWith('video/') || file.name.match(/\.(mp4|mov|avi|webm|3gp|3g2)$/i)) {
                const acceptedFormats = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/3gpp', 'video/3gpp2'];
                const hasValidExtension = file.name.match(/\.(mp4|mov|avi|webm|3gp|3g2)$/i);
                
                if (!acceptedFormats.includes(file.type) && !hasValidExtension) {
                    alert(`⚠️ Format vidéo non supporté\n\nFormats acceptés:\n- MP4 (.mp4)\n- MOV (.mov)\n- AVI (.avi)\n- WebM (.webm)\n- 3GP (.3gp)`);
                    fileInput.value = '';
                    return;
                }
            }
            
            selectedFile = file;
            showFilePreview(file);
        }
    });

    function showFilePreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewContent.innerHTML = '';
            const isVideo = file.type.startsWith('video/') || file.name.match(/\.(mp4|mov|avi|webm|3gp|3g2)$/i);
            
            if (isVideo) {
                const video = document.createElement('video');
                video.src = e.target.result;
                video.controls = true;
                video.muted = true;
                video.style.maxWidth = '200px';
                video.style.maxHeight = '150px';
                previewContent.appendChild(video);
                
                // Obtenir la durée de la vidéo
                video.onloadedmetadata = function() {
                    const duration = Math.floor(video.duration);
                    const minutes = Math.floor(duration / 60);
                    const seconds = duration % 60;
                    fileInfo.innerHTML = `📹 ${file.name}<br>Taille: ${(file.size / 1024 / 1024).toFixed(2)} MB | Durée: ${minutes}:${seconds.toString().padStart(2, '0')}`;
                };
                
                video.onerror = function() {
                    fileInfo.innerHTML = `📹 ${file.name}<br>Taille: ${(file.size / 1024 / 1024).toFixed(2)} MB`;
                };
            } else {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.maxWidth = '200px';
                img.style.maxHeight = '150px';
                previewContent.appendChild(img);
                fileInfo.innerHTML = `📎 ${file.name}<br>Taille: ${(file.size / 1024 / 1024).toFixed(2)} MB`;
            }
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
                const mediaIcon = message.media.type === 'video' ? '📹' : '🖼️';
                mediaHtml = `
                    <div class="message-media">
                        <div class="media-container" data-media-url="${message.media.url}" data-media-type="${message.media.type}" data-message-id="${message.id}">
                            <div class="media-placeholder">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                    <polyline points="21 15 16 10 5 21"></polyline>
                                </svg>
                                <span>${mediaIcon} Cliquez pour voir (vue unique)</span>
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
            video.style.maxWidth = '100%';
            video.style.maxHeight = '90vh';
            mediaModalContent.appendChild(video);
        }

        mediaModal.classList.add('active');
    }

    closeModal.addEventListener('click', () => {
        mediaModal.classList.remove('active');
        const video = mediaModalContent.querySelector('video');
        if (video) {
            video.pause();
        }
        mediaModalContent.innerHTML = '';
    });

    mediaModal.addEventListener('click', (e) => {
        if (e.target === mediaModal) {
            mediaModal.classList.remove('active');
            const video = mediaModalContent.querySelector('video');
            if (video) {
                video.pause();
            }
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
                fileButton.disabled = true;

                const messageData = {
                    text: text || '📎 Fichier partagé',
                    timestamp: serverTimestamp(),
                    viewedBy: []
                };

                if (selectedFile) {
                    // Afficher la progression pour les vidéos
                    const isVideo = selectedFile.type.startsWith('video/') || selectedFile.name.match(/\.(mp4|mov|avi|webm|3gp|3g2)$/i);
                    if (isVideo) {
                        uploadingSpinner.textContent = '📹 Upload de la vidéo en cours... Cela peut prendre quelques minutes selon la taille.';
                    }
                    
                    try {
                        const uploadResult = await uploadToCloudinary(selectedFile);
                        messageData.media = uploadResult;
                    } catch (uploadError) {
                        // Afficher l'erreur à l'utilisateur
                        uploadingSpinner.classList.remove('active');
                        uploadingSpinner.textContent = '⏳ Upload en cours...';
                        sendButton.disabled = false;
                        fileButton.disabled = false;
                        alert(uploadError.message);
                        return; // Arrêter l'envoi
                    }
                }

                if (replyingToMessage) {
                    messageData.replyTo = replyingToMessage.text;
                    messageData.replyToId = replyingToMessage.id;
                }

                await addDoc(collection(db, 'messages'), messageData);

                // Réinitialiser l'interface
                messageInput.value = '';
                selectedFile = null;
                fileInput.value = '';
                filePreview.classList.remove('active');
                previewContent.innerHTML = '';
                fileInfo.textContent = '';
                replyingToMessage = null;
                replyingBanner.classList.remove('active');
                uploadingSpinner.classList.remove('active');
                uploadingSpinner.textContent = '⏳ Upload en cours...';
                sendButton.disabled = false;
                fileButton.disabled = false;
            } catch (error) {
                console.error('Erreur lors de l\'envoi:', error);
                alert('❌ Erreur lors de l\'envoi du message. Veuillez réessayer.');
                uploadingSpinner.classList.remove('active');
                uploadingSpinner.textContent = '⏳ Upload en cours...';
                sendButton.disabled = false;
                fileButton.disabled = false;
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
