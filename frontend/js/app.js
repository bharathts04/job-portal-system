const API_URL = 'http://localhost:8081/api';

// Utility for showing toasts
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    const toastIcon = document.getElementById('toastIcon');
    
    toastMsg.textContent = message;
    
    // Reset classes
    toast.className = 'toast show';
    toastIcon.className = 'fa-solid';
    
    if (type === 'success') {
        toast.classList.add('success');
        toastIcon.classList.add('fa-check-circle');
    } else if (type === 'error') {
        toast.classList.add('error');
        toastIcon.classList.add('fa-circle-xmark');
    } else {
        toastIcon.classList.add('fa-circle-info');
    }
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Fetch all jobs
async function fetchJobs() {
    const container = document.getElementById('jobsContainer');
    if (!container) return;

    try {
        const response = await fetch(`${API_URL}/jobs`);
        if (!response.ok) throw new Error('Failed to fetch jobs');
        
        const jobs = await response.json();
        
        if (jobs.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; width: 100%; grid-column: 1 / -1; padding: 3rem;">
                    <i class="fa-solid fa-folder-open fa-3x" style="color: var(--border-color); margin-bottom: 1rem;"></i>
                    <h3>No jobs found</h3>
                    <p style="color: var(--text-secondary);">Check back later for new opportunities.</p>
                </div>
            `;
            return;
        }

        let appliedJobIds = [];
        if (isAuthenticated() && JSON.parse(localStorage.getItem('user')).role === 'ROLE_SEEKER') {
            try {
                const appRes = await fetch(`${API_URL}/applications/my-applications`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                if (appRes.ok) {
                    const apps = await appRes.json();
                    appliedJobIds = apps.map(app => app.job.id);
                }
            } catch(e) { console.error(e); }
        }

        container.innerHTML = ''; // Clear loading
        
        jobs.forEach(job => {
            const date = new Date(job.createdAt).toLocaleDateString();
            const isApplied = appliedJobIds.includes(job.id);
            const applyBtn = isApplied ? 
                `<button class="btn btn-outline" disabled style="padding: 0.5rem 1rem; border-color: var(--success); color: var(--success);"><i class="fa-solid fa-check"></i> Applied</button>` : 
                `<button class="btn btn-primary" onclick="applyJob(${job.id})" style="padding: 0.5rem 1rem;">Apply Now</button>`;
            
            const card = document.createElement('div');
            card.className = 'job-card';
            card.innerHTML = `
                <div class="job-header">
                    <div>
                        <h3 class="job-title">${job.title}</h3>
                        <span class="job-company"><i class="fa-solid fa-building"></i> ${job.companyName || 'Unknown Company'}</span>
                    </div>
                    <button class="btn btn-outline" style="padding: 0.5rem;" title="Save Job">
                        <i class="fa-regular fa-bookmark"></i>
                    </button>
                </div>
                
                <div class="job-details">
                    <div class="job-detail-item">
                        <i class="fa-solid fa-location-dot"></i> ${job.location}
                    </div>
                    <div class="job-detail-item">
                        <i class="fa-regular fa-clock"></i> ${date}
                    </div>
                </div>
                
                <div class="job-tags">
                    ${job.skills ? job.skills.split(',').map(skill => `<span class="job-tag">${skill.trim()}</span>`).join('') : ''}
                </div>
                
                <p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 1.5rem; flex: 1;">
                    ${job.description ? job.description.substring(0, 100) + '...' : ''}
                </p>
                
                <div class="job-footer">
                    <span class="job-salary">${job.salary || 'Not disclosed'}</span>
                    ${applyBtn}
                </div>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = `
            <div style="text-align: center; width: 100%; grid-column: 1 / -1; padding: 3rem; color: var(--danger);">
                <i class="fa-solid fa-triangle-exclamation fa-2x"></i>
                <p style="margin-top: 1rem;">Failed to load jobs. Please make sure the backend is running.</p>
            </div>
        `;
    }
}

// Search jobs
async function searchJobs() {
    const keyword = document.getElementById('searchInput').value;
    if (!keyword) {
        return fetchJobs();
    }
    
    const container = document.getElementById('jobsContainer');
    container.innerHTML = '<div style="text-align: center; width: 100%; grid-column: 1 / -1; padding: 3rem; color: var(--text-secondary);"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div>';

    try {
        const response = await fetch(`${API_URL}/jobs/search?keyword=${encodeURIComponent(keyword)}`);
        const jobs = await response.json();
        
        // Use the same logic as fetchJobs to render
        // For brevity, we'll just reload the container content
        if (jobs.length === 0) {
            container.innerHTML = `<div style="text-align: center; width: 100%; grid-column: 1 / -1; padding: 3rem;"><h3>No matching jobs found</h3></div>`;
            return;
        }
        
        let appliedJobIds = [];
        if (isAuthenticated() && JSON.parse(localStorage.getItem('user')).role === 'ROLE_SEEKER') {
            try {
                const appRes = await fetch(`${API_URL}/applications/my-applications`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                if (appRes.ok) {
                    const apps = await appRes.json();
                    appliedJobIds = apps.map(app => app.job.id);
                }
            } catch(e) {}
        }

        container.innerHTML = '';
        jobs.forEach(job => {
            const date = new Date(job.createdAt).toLocaleDateString();
            const isApplied = appliedJobIds.includes(job.id);
            const applyBtn = isApplied ? 
                `<button class="btn btn-outline" disabled style="padding: 0.5rem 1rem; border-color: var(--success); color: var(--success);"><i class="fa-solid fa-check"></i> Applied</button>` : 
                `<button class="btn btn-primary" onclick="applyJob(${job.id})" style="padding: 0.5rem 1rem;">Apply Now</button>`;

            const card = document.createElement('div');
            card.className = 'job-card';
            card.innerHTML = `
                <div class="job-header">
                    <div>
                        <h3 class="job-title">${job.title}</h3>
                        <span class="job-company"><i class="fa-solid fa-building"></i> ${job.companyName || 'Unknown Company'}</span>
                    </div>
                </div>
                <div class="job-details">
                    <div class="job-detail-item"><i class="fa-solid fa-location-dot"></i> ${job.location}</div>
                </div>
                <div class="job-tags">
                    ${job.skills ? job.skills.split(',').map(skill => `<span class="job-tag">${skill.trim()}</span>`).join('') : ''}
                </div>
                <div class="job-footer">
                    <span class="job-salary">${job.salary || 'Not disclosed'}</span>
                    ${applyBtn}
                </div>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.error('Error:', error);
        showToast('Search failed', 'error');
    }
}

// Check authentication
function isAuthenticated() {
    return localStorage.getItem('token') !== null;
}

// Update UI based on Auth state
function updateAuthUI() {
    const navLinks = document.getElementById('navLinks');
    if (!navLinks) return;

    if (isAuthenticated()) {
        const user = JSON.parse(localStorage.getItem('user'));
        navLinks.innerHTML = `
            <a href="${user.role === 'ROLE_RECRUITER' ? 'pages/dashboard-recruiter.html' : 'pages/dashboard-seeker.html'}">Dashboard</a>
            <span style="font-weight: 600; color: var(--primary-color);">Hello, ${user.username}</span>
            <button class="btn btn-outline" onclick="logout()" style="padding: 0.5rem 1rem;">Log Out</button>
        `;
    }
}

// Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html';
}

// Apply for a job
async function applyJob(jobId) {
    if (!isAuthenticated()) {
        showToast('Please login to apply for jobs', 'error');
        setTimeout(() => {
            window.location.href = window.location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html';
        }, 1500);
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/applications/apply/${jobId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            showToast('Successfully applied for the job!', 'success');
            // Refresh jobs to show "Applied" button
            fetchJobs();
        } else {
            const msg = await response.text();
            showToast(msg || 'Failed to apply', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('An error occurred', 'error');
    }
}
