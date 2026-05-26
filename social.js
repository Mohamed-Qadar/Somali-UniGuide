// Supabase Configuration Placeholders
// Replace these with your actual Supabase Project API credentials!
(() => {
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

let supabaseClient = null;
let isMockMode = true;

// Initialize Supabase client if credentials are configured
if (SUPABASE_URL !== "YOUR_SUPABASE_URL" && SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY") {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    isMockMode = false;
    console.log("Supabase initialized successfully.");
  } catch (err) {
    console.warn("Failed to initialize Supabase. Falling back to local simulation.", err);
    isMockMode = true;
  }
} else {
  console.log("Using LocalStorage Simulation Mode. Configure Supabase credentials in social.js to enable cloud syncing.");
}

// -------------------------------------------------------------
// STATE MANAGEMENT & DATA SIMULATOR FOR MOCK MODE
// -------------------------------------------------------------
// Safe state parsers to prevent SyntaxError if localStorage has invalid/undefined values
let currentUser = null;
try {
  const storedUser = localStorage.getItem("uniguide_user");
  if (storedUser && storedUser !== "undefined") {
    currentUser = JSON.parse(storedUser);
  }
} catch (e) {
  console.error("Error parsing stored user:", e);
}

let posts = null;
try {
  const storedPosts = localStorage.getItem("uniguide_posts");
  if (storedPosts && storedPosts !== "undefined") {
    posts = JSON.parse(storedPosts);
  }
} catch (e) {
  console.error("Error parsing stored posts:", e);
}
if (!posts) {
  posts = [
    {
      id: "mock-post-1",
      username: "abdirahman_ali",
      phone_number: "+252 61 5550101",
      content: "Hey everyone! Does anyone have the medicine faculty syllabus for Benadir University? Pls share!",
      file_url: null,
      file_type: null,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      likes: ["mock-user-2"],
      comments: [
        {
          id: "mock-comment-1",
          username: "halima_farah",
          comment_text: "I think it is on their main portal under downloads, but I can upload it if you need it."
        }
      ]
    },
    {
      id: "mock-post-2",
      username: "halima_farah",
      phone_number: "+252 61 5550202",
      content: "Check out this beautiful view of the SNU campus library!",
      file_url: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600&auto=format&fit=crop&q=60",
      file_type: "image/png",
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      likes: [],
      comments: []
    }
  ];
}

let members = null;
try {
  const storedMembers = localStorage.getItem("uniguide_members");
  if (storedMembers && storedMembers !== "undefined") {
    members = JSON.parse(storedMembers);
  }
} catch (e) {
  console.error("Error parsing stored members:", e);
}
if (!members) {
  members = [
    { username: "abdirahman_ali", phone_number: "+252 61 5550101" },
    { username: "halima_farah", phone_number: "+252 61 5550202" },
    { username: "mohamed_warsame", phone_number: "+252 61 5550303" }
  ];
}

const state = {
  currentUser,
  posts,
  members
};

// Helper to save state in local storage
const saveMockState = () => {
  localStorage.setItem("uniguide_posts", JSON.stringify(state.posts));
  localStorage.setItem("uniguide_members", JSON.stringify(state.members));
};

// -------------------------------------------------------------
// DOM ELEMENT SELECTIONS
// -------------------------------------------------------------
const dom = {
  authBtn: document.getElementById("authBtn"),
  authModal: document.getElementById("authModal"),
  closeAuthBtn: document.getElementById("closeAuthBtn"),
  loginForm: document.getElementById("loginForm"),
  registerForm: document.getElementById("registerForm"),
  loginTabBtn: document.getElementById("loginTabBtn"),
  registerTabBtn: document.getElementById("registerTabBtn"),
  
  directoryTabBtn: document.getElementById("directoryTabBtn"),
  feedTabBtn: document.getElementById("feedTabBtn"),
  feedSection: document.getElementById("feedSection"),
  directoryElements: document.querySelectorAll(".directory-only"),
  
  postCreator: document.getElementById("postCreator"),
  feedAuthWarning: document.getElementById("feedAuthWarning"),
  postForm: document.getElementById("postForm"),
  postText: document.getElementById("postText"),
  postImage: document.getElementById("postImage"),
  postDoc: document.getElementById("postDoc"),
  filePreview: document.getElementById("filePreview"),
  feedStream: document.getElementById("feedStream"),
  membersList: document.getElementById("membersList"),
};

// -------------------------------------------------------------
// VISIBILITY / TAB SWITCHING LOGIC
// -------------------------------------------------------------
if (dom.directoryTabBtn && dom.feedTabBtn) {
  dom.directoryTabBtn.addEventListener("click", () => {
    dom.directoryTabBtn.classList.add("active");
    dom.feedTabBtn.classList.remove("active");
    dom.feedSection.classList.add("hidden");
    
    // Show all directory elements
    dom.directoryElements.forEach(el => el.classList.remove("hidden"));
  });

  dom.feedTabBtn.addEventListener("click", () => {
    dom.feedTabBtn.classList.add("active");
    dom.directoryTabBtn.classList.remove("active");
    dom.feedSection.classList.remove("hidden");
    
    // Hide all directory elements
    dom.directoryElements.forEach(el => el.classList.add("hidden"));
    
    // Initialize feed content
    renderFeed();
    renderMembers();
  });
}

// -------------------------------------------------------------
// AUTH MODAL & STATE CONTROL
// -------------------------------------------------------------
const updateAuthUI = () => {
  if (state.currentUser) {
    dom.authBtn.textContent = "My Profile";
    dom.postCreator.classList.remove("hidden");
    dom.feedAuthWarning.classList.add("hidden");
  } else {
    dom.authBtn.textContent = "Join Community";
    dom.postCreator.classList.add("hidden");
    dom.feedAuthWarning.classList.remove("hidden");
  }
};

if (dom.authBtn) {
  dom.authBtn.addEventListener("click", async () => {
    if (state.currentUser) {
      const shouldLogout = window.confirm(
        `Signed in as @${state.currentUser.username || "student"}.\n\nDo you want to sign out?`
      );
      if (!shouldLogout) return;

      if (isMockMode) {
        state.currentUser = null;
        localStorage.removeItem("uniguide_user");
        updateAuthUI();
        renderFeed();
        renderMembers();
      } else {
        await supabaseClient.auth.signOut();
        state.currentUser = null;
        localStorage.removeItem("uniguide_user");
        updateAuthUI();
        renderFeed();
        renderMembers();
      }
    } else {
      // Open modal
      dom.authModal.classList.remove("hidden");
    }
  });
}

if (dom.closeAuthBtn) {
  dom.closeAuthBtn.addEventListener("click", () => {
    dom.authModal.classList.add("hidden");
  });
}

// Switch auth tabs
if (dom.loginTabBtn && dom.registerTabBtn) {
  dom.loginTabBtn.addEventListener("click", () => {
    dom.loginTabBtn.classList.add("active");
    dom.registerTabBtn.classList.remove("active");
    dom.loginForm.classList.remove("hidden");
    dom.registerForm.classList.add("hidden");
  });

  dom.registerTabBtn.addEventListener("click", () => {
    dom.registerTabBtn.classList.add("active");
    dom.loginTabBtn.classList.remove("active");
    dom.registerForm.classList.remove("hidden");
    dom.loginForm.classList.add("hidden");
  });
}

// -------------------------------------------------------------
// USER SIGNUP & LOGIN PROCESS
// -------------------------------------------------------------
if (dom.registerForm) {
  dom.registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("regUsername").value.trim().toLowerCase();
    const phone = document.getElementById("regPhone").value.trim();
    const password = document.getElementById("regPassword").value;

    if (password.length < 6) {
      alert("Password must be at least 6 characters!");
      return;
    }

    if (isMockMode) {
      // Check username unique
      if (state.members.some(m => m.username === username)) {
        alert("Username already taken!");
        return;
      }
      
      const newUser = { username, phone_number: phone, id: "mock-user-" + Date.now() };
      state.members.push(newUser);
      state.currentUser = newUser;
      localStorage.setItem("uniguide_user", JSON.stringify(newUser));
      saveMockState();
      
      alert("Registration Successful!");
      dom.authModal.classList.add("hidden");
      dom.registerForm.reset();
      updateAuthUI();
      renderFeed();
      renderMembers();
    } else {
      // Supabase Phone Signup flow
      const { data, error } = await supabaseClient.auth.signUp({
        phone: phone,
        password: password,
        options: {
          data: { username: username }
        }
      });
      if (error) {
        alert("Registration failed: " + error.message);
      } else if (!data.user) {
        alert("Registration started. Please verify the phone number if your Supabase project requires SMS confirmation.");
      } else {
        // Insert public profile
        const { error: profileError } = await supabaseClient
          .from("profiles")
          .upsert([{ id: data.user.id, username, phone_number: phone }], { onConflict: "id" });
          
        if (profileError) {
          alert("Error creating user profile: " + profileError.message);
        } else {
          state.currentUser = { username, phone_number: phone, id: data.user.id };
          localStorage.setItem("uniguide_user", JSON.stringify(state.currentUser));
          alert("Registration Successful!");
          dom.authModal.classList.add("hidden");
          dom.registerForm.reset();
          updateAuthUI();
          renderFeed();
          renderMembers();
        }
      }
    }
  });
}

if (dom.loginForm) {
  dom.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const phone = document.getElementById("loginPhone").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (isMockMode) {
      // Mock Authentication matching credentials
      const user = state.members.find(m => m.phone_number === phone);
      if (user) {
        state.currentUser = user;
        localStorage.setItem("uniguide_user", JSON.stringify(user));
        alert("Welcome back!");
        dom.authModal.classList.add("hidden");
        dom.loginForm.reset();
        updateAuthUI();
        renderFeed();
        renderMembers();
      } else {
        alert("User not found! Register first.");
      }
    } else {
      // Supabase Authentication query
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        phone: phone,
        password: password
      });
      if (error) {
        alert("Login failed: " + error.message);
      } else {
        // Fetch profiles
        const { data: profile, error: pError } = await supabaseClient
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();
          
        if (pError) {
          alert("Error fetching profile: " + pError.message);
        } else {
          state.currentUser = profile;
          localStorage.setItem("uniguide_user", JSON.stringify(profile));
          alert("Welcome back!");
          dom.authModal.classList.add("hidden");
          dom.loginForm.reset();
          updateAuthUI();
          renderFeed();
          renderMembers();
        }
      }
    }
  });
}

// -------------------------------------------------------------
// ATTACHMENT PREVIEW HANDLER
// -------------------------------------------------------------
let selectedImageFile = null;
let selectedDocFile = null;

if (dom.postImage) {
  dom.postImage.addEventListener("change", (e) => {
    selectedImageFile = e.target.files[0];
    renderFilePreviews();
  });
}

if (dom.postDoc) {
  dom.postDoc.addEventListener("change", (e) => {
    selectedDocFile = e.target.files[0];
    renderFilePreviews();
  });
}

const renderFilePreviews = () => {
  dom.filePreview.innerHTML = "";
  if (selectedImageFile) {
    dom.filePreview.innerHTML += `<div>📸 Selected Image: ${selectedImageFile.name}</div>`;
  }
  if (selectedDocFile) {
    dom.filePreview.innerHTML += `<div>📄 Selected PDF: ${selectedDocFile.name}</div>`;
  }
};

// -------------------------------------------------------------
// POST CREATION HANDLER
// -------------------------------------------------------------
if (dom.postForm) {
  dom.postForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const content = dom.postText.value.trim();
    if (!content && !selectedImageFile && !selectedDocFile) {
      alert("Write some text or choose a file first!");
      return;
    }

    if (selectedImageFile && selectedDocFile) {
      alert("Please attach one file per post: either a PNG image or a PDF document.");
      return;
    }

    if (isMockMode) {
      // Simulate file attachments URLs
      let fileUrl = null;
      let fileType = null;
      if (selectedImageFile) {
        fileUrl = URL.createObjectURL(selectedImageFile);
        fileType = selectedImageFile.type;
      }
      if (selectedDocFile) {
        fileUrl = URL.createObjectURL(selectedDocFile);
        fileType = selectedDocFile.type;
      }

      const newPost = {
        id: "mock-post-" + Date.now(),
        username: state.currentUser.username,
        phone_number: state.currentUser.phone_number,
        content,
        file_url: fileUrl,
        file_type: fileType,
        created_at: new Date().toISOString(),
        likes: [],
        comments: []
      };

      state.posts.unshift(newPost);
      saveMockState();
      
      dom.postForm.reset();
      selectedImageFile = null;
      selectedDocFile = null;
      renderFilePreviews();
      renderFeed();
    } else {
      // Real Supabase storage uploads and db insertions
      let fileUrl = null;
      let fileType = null;

      // Handle PNG upload
      if (selectedImageFile) {
        const fileExt = selectedImageFile.name.split('.').pop();
        const filePath = `${state.currentUser.id}/posts/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabaseClient.storage
          .from('files')
          .upload(filePath, selectedImageFile);
        if (!uploadError) {
          const { data } = supabaseClient.storage.from('files').getPublicUrl(filePath);
          fileUrl = data.publicUrl;
          fileType = selectedImageFile.type;
        }
      }

      // Handle PDF upload
      if (selectedDocFile) {
        const fileExt = selectedDocFile.name.split('.').pop();
        const filePath = `${state.currentUser.id}/docs/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabaseClient.storage
          .from('files')
          .upload(filePath, selectedDocFile);
        if (!uploadError) {
          const { data } = supabaseClient.storage.from('files').getPublicUrl(filePath);
          fileUrl = data.publicUrl;
          fileType = selectedDocFile.type;
        }
      }

      const { error } = await supabaseClient
        .from("posts")
        .insert([{
          user_id: state.currentUser.id,
          content,
          file_url: fileUrl,
          file_type: fileType
        }]);

      if (error) {
        alert("Failed to post: " + error.message);
      } else {
        dom.postForm.reset();
        selectedImageFile = null;
        selectedDocFile = null;
        renderFilePreviews();
        await loadCloudFeed();
      }
    }
  });
}

// -------------------------------------------------------------
// LIKE & COMMENT HANDLERS
// -------------------------------------------------------------
window.toggleLike = async (postId) => {
  if (!state.currentUser) {
    alert("Please sign in to like posts!");
    return;
  }

  if (isMockMode) {
    const post = state.posts.find(p => p.id === postId);
    if (!post) return;

    const likeIdx = post.likes.indexOf(state.currentUser.id);
    if (likeIdx === -1) {
      post.likes.push(state.currentUser.id);
    } else {
      post.likes.splice(likeIdx, 1);
    }
    saveMockState();
    renderFeed();
  } else {
    // Check if liked already
    const { data: liked } = await supabaseClient
      .from("likes")
      .select("*")
      .eq("post_id", postId)
      .eq("user_id", state.currentUser.id)
      .maybeSingle();

    if (liked) {
      await supabaseClient.from("likes").delete().eq("post_id", postId).eq("user_id", state.currentUser.id);
    } else {
      await supabaseClient.from("likes").insert([{ post_id: postId, user_id: state.currentUser.id }]);
    }
    await loadCloudFeed();
  }
};

window.submitComment = async (e, postId) => {
  e.preventDefault();
  if (!state.currentUser) {
    alert("Please sign in to comment!");
    return;
  }

  const commentInput = document.getElementById(`comment-input-${postId}`);
  const text = commentInput.value.trim();
  if (!text) return;

  if (isMockMode) {
    const post = state.posts.find(p => p.id === postId);
    if (!post) return;

    post.comments.push({
      id: "mock-comment-" + Date.now(),
      username: state.currentUser.username,
      comment_text: text
    });
    saveMockState();
    renderFeed();
  } else {
    const { error } = await supabaseClient
      .from("comments")
      .insert([{
        post_id: postId,
        user_id: state.currentUser.id,
        comment_text: text
      }]);

    if (error) {
      alert("Failed to submit comment: " + error.message);
    } else {
      await loadCloudFeed();
    }
  }
};

// -------------------------------------------------------------
// FEED RENDERING PROCESS
// -------------------------------------------------------------
const renderFeed = () => {
  if (!dom.feedStream) return;
  dom.feedStream.innerHTML = "";

  if (state.posts.length === 0) {
    dom.feedStream.innerHTML = '<div class="card">Akışta henüz paylaşım yok. İlk paylaşımı sen yap!</div>';
    return;
  }

  state.posts.forEach(post => {
    const card = document.createElement("article");
    card.className = "card feed-card";

    // Header metadata
    const header = document.createElement("div");
    header.className = "feed-card-header";
    const initial = post.username.charAt(0);
    
    header.innerHTML = `
      <div class="member-avatar">${initial}</div>
      <div class="feed-card-meta">
        <span class="username">@${post.username}</span>
        <span class="timestamp">${new Date(post.created_at).toLocaleString()}</span>
      </div>
    `;

    // Text content
    const content = document.createElement("p");
    content.className = "feed-card-content";
    content.textContent = post.content || post.content_text || "";

    card.append(header, content);

    const fileUrl = post.file_url || post.media_url || post.document_url;
    const fileType = post.file_type || (post.media_url ? "image/png" : null);

    // Media (PNG image) attachment
    if (fileUrl && fileType?.startsWith("image/")) {
      const img = document.createElement("img");
      img.className = "post-media-img";
      img.src = fileUrl;
      img.alt = "Post media";
      card.append(img);
    }

    // Document (PDF) attachment
    if (fileUrl && !fileType?.startsWith("image/")) {
      const docLink = document.createElement("a");
      docLink.className = "post-doc-link";
      docLink.href = fileUrl;
      docLink.target = "_blank";
      docLink.innerHTML = `📄 View syllabus PDF document`;
      card.append(docLink);
    }

    // Likes & interaction bar
    const interactionBar = document.createElement("div");
    interactionBar.className = "post-interaction-bar";
    const userLiked = state.currentUser && post.likes.includes(state.currentUser.id);
    const likeBtn = document.createElement("button");
    likeBtn.className = `interaction-btn ${userLiked ? "liked" : ""}`;
    likeBtn.innerHTML = `❤️ Like (${post.likes.length})`;
    likeBtn.onclick = () => window.toggleLike(post.id);
    interactionBar.append(likeBtn);
    card.append(interactionBar);

    // Comments section
    const commentsSec = document.createElement("div");
    commentsSec.className = "post-comments-section";
    const list = document.createElement("div");
    list.className = "comment-list";

    (post.comments || []).forEach(c => {
      const item = document.createElement("div");
      item.className = "comment-item";
      const author = document.createElement("strong");
      author.textContent = `@${c.username}`;
      item.append(author, `: ${c.comment_text}`);
      list.append(item);
    });

    if ((post.comments || []).length === 0) {
      list.innerHTML = '<p class="muted" style="font-size:0.8rem;margin:0;">No comments yet.</p>';
    }

    const form = document.createElement("form");
    form.className = "comment-form";
    form.onsubmit = (e) => window.submitComment(e, post.id);
    form.innerHTML = `
      <input type="text" id="comment-input-${post.id}" placeholder="Write a comment..." required />
      <button type="submit">Send</button>
    `;

    commentsSec.append(list, form);
    card.append(commentsSec);

    dom.feedStream.append(card);
  });
};

// -------------------------------------------------------------
// MEMBERS LIST DIRECTORY RENDERING
// -------------------------------------------------------------
const renderMembers = () => {
  if (!dom.membersList) return;
  dom.membersList.innerHTML = "";

  if (!state.currentUser) {
    dom.membersList.innerHTML = '<p class="muted">Sign in to view students and their contact info.</p>';
    return;
  }

  if (state.members.length === 0) {
    dom.membersList.innerHTML = '<p class="muted">No community members yet.</p>';
    return;
  }

  state.members.forEach(member => {
    const item = document.createElement("div");
    item.className = "member-item";
    const initial = member.username.charAt(0);
    item.innerHTML = `
      <div class="member-avatar" style="width:28px;height:28px;font-size:0.75rem;">${initial}</div>
      <div class="member-info">
        <span class="name">@${member.username}</span>
        <span class="phone">${member.phone_number}</span>
      </div>
    `;
    dom.membersList.append(item);
  });
};

// -------------------------------------------------------------
// CLOUD RETRIEVAL ENGINE FOR REAL SUPABASE MODE
// -------------------------------------------------------------
const loadCloudFeed = async () => {
  if (isMockMode) return;
  
  // Query posts with profiles
  const { data: posts, error } = await supabaseClient
    .from("posts")
    .select(`
      id,
      content,
      file_url,
      file_type,
      created_at,
      profiles (
        username,
        phone_number
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching posts:", error);
    return;
  }

  // Fetch likes and comments for each post
  const enrichedPosts = [];
  for (const post of posts) {
    const { data: likes } = await supabaseClient.from("likes").select("user_id").eq("post_id", post.id);
    const { data: comments } = await supabaseClient
      .from("comments")
      .select(`
        id,
        comment_text,
        profiles (
          username
        )
      `)
      .eq("post_id", post.id);

    enrichedPosts.push({
      id: post.id,
      username: post.profiles.username,
      phone_number: post.profiles.phone_number,
      content: post.content,
      file_url: post.file_url,
      file_type: post.file_type,
      created_at: post.created_at,
      likes: (likes || []).map(l => l.user_id),
      comments: (comments || []).map(c => ({
        id: c.id,
        username: c.profiles.username,
        comment_text: c.comment_text
      }))
    });
  }

  state.posts = enrichedPosts;
  renderFeed();
};

const loadCloudMembers = async () => {
  if (isMockMode) return;
  const { data: members, error } = await supabaseClient.from("profiles").select("id, username, phone_number");
  if (!error) {
    state.members = members;
    renderMembers();
  }
};

const loadCurrentProfile = async (userId) => {
  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("id, username, phone_number")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error loading profile:", error);
    return null;
  }

  return profile;
};

const initializeCommunity = async () => {
  if (isMockMode) {
    updateAuthUI();
    renderFeed();
    renderMembers();
    return;
  }

  const { data: sessionData } = await supabaseClient.auth.getSession();
  const user = sessionData.session?.user;
  if (user) {
    state.currentUser = await loadCurrentProfile(user.id);
    if (state.currentUser) {
      localStorage.setItem("uniguide_user", JSON.stringify(state.currentUser));
    }
  } else {
    state.currentUser = null;
    localStorage.removeItem("uniguide_user");
  }

  updateAuthUI();
  await loadCloudFeed();
  await loadCloudMembers();

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    const authUser = session?.user;
    state.currentUser = authUser ? await loadCurrentProfile(authUser.id) : null;
    if (state.currentUser) {
      localStorage.setItem("uniguide_user", JSON.stringify(state.currentUser));
    } else {
      localStorage.removeItem("uniguide_user");
    }
    updateAuthUI();
    await loadCloudFeed();
    await loadCloudMembers();
  });
};

// Initial Call
initializeCommunity();
})();
