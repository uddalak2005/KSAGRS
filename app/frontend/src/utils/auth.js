// Custom JWT Authentication Utility to replace Firebase Auth

export const auth = {
  get currentUser() {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        return JSON.parse(storedUser);
      }
    } catch (e) {
      console.error("Error parsing user from localStorage:", e);
    }
    return null;
  }
};

// Handle registration calling the backend API
export const signUpUser = async (registrationData) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/user/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(registrationData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to register account.");
    }

    const data = await response.json();
    if (data.token && data.user) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
    }
    return data.user;
  } catch (error) {
    console.error("Signup helper error:", error.message);
    throw error;
  }
};

// Handle login calling the backend API
export const signInUser = async (email, password) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/user/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to login.");
    }

    const data = await response.json();
    if (data.token && data.user) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
    }
    return data.user;
  } catch (error) {
    console.error("Signin helper error:", error.message);
    throw error;
  }
};

// Handle user sign out
export const signOutUser = async () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("userData");
  console.log("Logged out successfully from JWT session");
};

// Subscribes to authentication state changes (replaces Firebase onAuthStateChanged)
export const onAuthStateChanged = (callback) => {
  const checkAuth = () => {
    const user = auth.currentUser;
    const token = localStorage.getItem("token");
    if (user && token) {
      callback(user);
    } else {
      callback(null);
    }
  };

  // Run initially
  checkAuth();

  // Listen to storage events for cross-tab sync
  window.addEventListener("storage", checkAuth);

  return () => {
    window.removeEventListener("storage", checkAuth);
  };
};
