<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HiFiles - Header Profile</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        }
        
        body {
            background-color: #f8fafc;
            color: #1e293b;
            line-height: 1.6;
        }
        
        /* Header with profile toggle */
        .main-header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background-color: white;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
            z-index: 1000;
            padding: 0 20px;
        }
        
        .header-container {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 0;
        }
        
        .logo {
            font-size: 24px;
            font-weight: 700;
            color: #3b82f6;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .logo i {
            font-size: 26px;
        }
        
        /* Profile toggle in top right */
        .profile-toggle-container {
            position: relative;
        }
        
        .profile-toggle-btn {
            display: flex;
            align-items: center;
            gap: 10px;
            background: none;
            border: none;
            cursor: pointer;
            padding: 8px 12px;
            border-radius: 8px;
            transition: background-color 0.2s;
        }
        
        .profile-toggle-btn:hover {
            background-color: #f1f5f9;
        }
        
        .user-avatar-small {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background-color: #3b82f6;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 16px;
        }
        
        .user-name-small {
            font-weight: 600;
            color: #1e293b;
        }
        
        .toggle-arrow {
            color: #64748b;
            transition: transform 0.3s;
        }
        
        .profile-toggle-btn.active .toggle-arrow {
            transform: rotate(180deg);
        }
        
        /* Profile dropdown (hidden by default) */
        .profile-dropdown {
            position: absolute;
            top: 100%;
            right: 0;
            width: 320px;
            background-color: white;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
            margin-top: 10px;
            opacity: 0;
            visibility: hidden;
            transform: translateY(-10px);
            transition: opacity 0.3s, transform 0.3s, visibility 0.3s;
            overflow: hidden;
            z-index: 1001;
        }
        
        .profile-dropdown.active {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
        }
        
        /* Profile content inside dropdown */
        .profile-header {
            padding: 24px;
            border-bottom: 1px solid #e2e8f0;
            background-color: #f8fafc;
        }
        
        .profile-avatar-large {
            width: 70px;
            height: 70px;
            border-radius: 50%;
            background-color: #3b82f6;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 16px;
        }
        
        .profile-name {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 4px;
            color: #0f172a;
        }
        
        .profile-email {
            color: #64748b;
            margin-bottom: 16px;
        }
        
        .profile-status {
            display: flex;
            gap: 10px;
        }
        
        .status-badge {
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
        }
        
        .status-free {
            background-color: #dcfce7;
            color: #166534;
        }
        
        .status-active {
            background-color: #dbeafe;
            color: #1e40af;
        }
        
        .profile-actions {
            padding: 20px;
        }
        
        .action-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 14px;
            border-radius: 8px;
            cursor: pointer;
            transition: background-color 0.2s;
            color: #475569;
            text-decoration: none;
        }
        
        .action-item:hover {
            background-color: #f1f5f9;
            color: #1e293b;
        }
        
        .action-icon {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            background-color: #e2e8f0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #475569;
        }
        
        .action-item:hover .action-icon {
            background-color: #3b82f6;
            color: white;
        }
        
        .action-text {
            font-weight: 500;
        }
        
        /* Main content */
        .main-content {
            max-width: 1200px;
            margin: 120px auto 60px;
            padding: 0 20px;
        }
        
        h1 {
            font-size: 2.8rem;
            font-weight: 800;
            color: #0f172a;
            line-height: 1.2;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .subtitle {
            font-size: 1.25rem;
            color: #475569;
            max-width: 700px;
            margin: 0 auto 40px;
            text-align: center;
        }
        
        /* Button styles */
        .buttons {
            display: flex;
            justify-content: center;
            gap: 16px;
            flex-wrap: wrap;
            margin-bottom: 50px;
        }
        
        .btn {
            padding: 14px 28px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .btn-primary {
            background-color: #3b82f6;
            color: white;
        }
        
        .btn-primary:hover {
            background-color: #2563eb;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
        }
        
        .btn-secondary {
            background-color: #e2e8f0;
            color: #1e293b;
        }
        
        .btn-secondary:hover {
            background-color: #cbd5e1;
            transform: translateY(-2px);
        }
        
        .btn-outline {
            background-color: transparent;
            color: #3b82f6;
            border: 2px solid #3b82f6;
        }
        
        .btn-outline:hover {
            background-color: #eff6ff;
            transform: translateY(-2px);
        }
        
        /* Trusted by section */
        .trusted-by {
            text-align: center;
            margin-bottom: 60px;
            padding-top: 30px;
            border-top: 1px solid #e2e8f0;
        }
        
        .trusted-by p {
            color: #64748b;
            font-size: 1.1rem;
            margin-bottom: 20px;
        }
        
        .university-logos {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 40px;
            flex-wrap: wrap;
        }
        
        .university {
            font-size: 1.3rem;
            font-weight: 600;
            color: #475569;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .university i {
            color: #3b82f6;
            font-size: 1.5rem;
        }
        
        /* Close dropdown when clicking outside */
        .dropdown-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 999;
            display: none;
        }
        
        /* Responsive design */
        @media (max-width: 768px) {
            h1 {
                font-size: 2.2rem;
            }
            
            .subtitle {
                font-size: 1.1rem;
            }
            
            .buttons {
                flex-direction: column;
                align-items: center;
            }
            
            .btn {
                width: 100%;
                max-width: 300px;
            }
            
            .profile-dropdown {
                width: 280px;
                right: 10px;
            }
            
            .user-name-small {
                display: none;
            }
        }
    </style>
</head>
 <body>
    <!-- Header with Profile Toggle -->
    <header class="main-header">
        <div class="header-container">
            <div class="logo">
                <i class="fas fa-robot"></i>
                HiFiles
            </div>
            
            <!-- Profile Toggle Container -->
            <div class="profile-toggle-container">
                <button class="profile-toggle-btn" id="profileToggle">
                    <div class="user-avatar-small">SM</div>
                    <span class="user-name-small">Sintayehu</span>
                    <i class="fas fa-chevron-down toggle-arrow"></i>
                </button>
                
                <!-- Profile Dropdown -->
                <div class="profile-dropdown" id="profileDropdown">
                    <div class="profile-header">
                        <div class="profile-avatar-large">SM</div>
                        <div class="profile-name">Sintayehu Mulugeta</div>
                        <div class="profile-email">sentaman20@gmail.com</div>
                        <div class="profile-status">
                            <span class="status-badge status-free">Free</span>
                            <span class="status-badge status-active">Active</span>
                        </div>
                    </div>
                    
                    <div class="profile-actions">
                        <a href="#" class="action-item" id="editProfile">
                            <div class="action-icon">
                                <i class="fas fa-user-edit"></i>
                            </div>
                            <span class="action-text">Edit Profile</span>
                        </a>
                        
                        <a href="#" class="action-item" id="support">
                            <div class="action-icon">
                                <i class="fas fa-headset"></i>
                            </div>
                            <span class="action-text">Support</span>
                        </a>
                        
                        <a href="#" class="action-item" id="logout">
                            <div class="action-icon">
                                <i class="fas fa-sign-out-alt"></i>
                            </div>
                            <span class="action-text">Logout</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </header>
    
    <!-- Overlay to close dropdown when clicking outside -->
    <div class="dropdown-overlay" id="dropdownOverlay"></div>
    
    <!-- Main Content -->
    <main class="main-content">
        <h1>Chat Smarter with AI-powered Conversations and Seamless File Integration.</h1>
        <p class="subtitle">Imagine never having to sift through pages of documents again. With HiFiles, simply upload your files, and our AI Assistant instantly analyzes the content, providing precise answers to your questions.</p>
        
        <div class="buttons">
            <button class="btn btn-secondary">
                <i class="fab fa-product-hunt"></i> Product Hunt
            </button>
            <button class="btn btn-primary">
                Get Started <i class="fas fa-arrow-right"></i>
            </button>
            <button class="btn btn-outline">
                Select a Plan
            </button>
        </div>
        
        <div class="trusted-by">
            <p>Trusted by leading universities worldwide</p>
            <div class="university-logos">
                <div class="university">
                    <i class="fas fa-university"></i> Stanford University
                </div>
                <div class="university">
                    <i class="fas fa-university"></i> Harvard University
                </div>
                <div class="university">
                    <i class="fas fa-university"></i> MIT
                </div>
            </div>
        </div>
    </main>

    <script>
        // Toggle profile dropdown
        const profileToggle = document.getElementById('profileToggle');
        const profileDropdown = document.getElementById('profileDropdown');
        const dropdownOverlay = document.getElementById('dropdownOverlay');

        profileToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            profileToggle.classList.toggle('active');
            profileDropdown.classList.toggle('active');
            dropdownOverlay.style.display = profileDropdown.classList.contains('active') ? 'block' : 'none';
        });

        // Close dropdown when clicking outside
        dropdownOverlay.addEventListener('click', function() {
            profileToggle.classList.remove('active');
            profileDropdown.classList.remove('active');
            dropdownOverlay.style.display = 'none';
        });

        // Profile action buttons
        document.getElementById('editProfile').addEventListener('click', function(e) {
            e.preventDefault();
            alert('Opening Edit Profile page...');
            closeDropdown();
        });

        document.getElementById('support').addEventListener('click', function(e) {
            e.preventDefault();
            alert('Opening Support Center...');
            closeDropdown();
        });

        document.getElementById('logout').addEventListener('click', function(e) {
            e.preventDefault();
            alert('Logging out... Redirecting to login page.');
            closeDropdown();
        });

        // Close dropdown function
        function closeDropdown() {
            profileToggle.classList.remove('active');
            profileDropdown.classList.remove('active');
            dropdownOverlay.style.display = 'none';
        }

        // Main content buttons
        document.querySelectorAll('.btn').forEach(button => {
            button.addEventListener('click', function() {
                const buttonText = this.textContent.trim();
                if(buttonText.includes('Get Started')) {
                    alert('Welcome to HiFiles! Let\'s get started.');
                } else if(buttonText.includes('Select a Plan')) {
                    alert('Opening plan selection options...');
                } else if(buttonText.includes('Product Hunt')) {
                    alert('Opening Product Hunt page...');
                }
            });
        });

        // Close dropdown when clicking Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeDropdown();
            }
        });
    </script>

  </body>
</html>
