import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
        import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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

        let replyingToMessage = null;
        let lastMessageCount = 0;

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

        // Toujours afficher l'intro vidéo au chargement de la page
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

        // Gestion de l'inscription
        registrationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const phoneNumber = document.getElementById('phoneNumber').value;

            if (phoneNumber) {
                try {
                    await addDoc(collection(db, 'users'), {
                        phone: phoneNumber,
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

        // Gestion des réponses
        cancelReply.addEventListener('click', () => {
            replyingToMessage = null;
            replyingBanner.classList.remove('active');
        });

        // Charger les messages depuis Firestore
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

            messageDiv.innerHTML = `
                <div class="message-header">
                    <div class="avatar">👤</div>
                    <span class="username">Anonyme</span>
                    <span class="timestamp">${time}</span>
                </div>
                ${replyHtml}
                <div class="message-text">${escapeHtml(message.text)}</div>
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

            messagesContainer.appendChild(messageDiv);
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Envoyer un message
        async function sendMessage() {
            const text = messageInput.value.trim();
            
            if (text) {
                try {
                    const messageData = {
                        text: text,
                        timestamp: serverTimestamp()
                    };

                    if (replyingToMessage) {
                        messageData.replyTo = replyingToMessage.text;
                        messageData.replyToId = replyingToMessage.id;
                    }

                    await addDoc(collection(db, 'messages'), messageData);

                    messageInput.value = '';
                    replyingToMessage = null;
                    replyingBanner.classList.remove('active');
                } catch (error) {
                    console.error('Erreur lors de l\'envoi du message:', error);
                    alert('Erreur lors de l\'envoi du message. Veuillez réessayer.');
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

        // Détecter quand l'utilisateur revient sur la page
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                lastMessageCount = messagesContainer.children.length;
            }
        });
    
