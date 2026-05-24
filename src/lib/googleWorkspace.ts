import { auth } from "./firebase";
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from "firebase/auth";

// Scopes required for Tasks, Sheets, and Slides
export const WORKSPACE_SCOPES = [
  "https://www.googleapis.com/auth/tasks",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/presentations"
];

let cachedAccessToken: string | null = null;
let isSigningIn = false;

/**
 * Initialize Google Auth State
 */
export const initWorkspaceAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // Try to get token if stored or ask for sign in
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Triggers Google Sign-In popup with requested Workspace scopes
 */
export const googleWorkspaceSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const provider = new GoogleAuthProvider();
    WORKSPACE_SCOPES.forEach(scope => provider.addScope(scope));

    // Force select_account to ensure scopes grant
    provider.setCustomParameters({
      prompt: "select_account"
    });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error("Failed to secure active Session Access Token from Google Workspace Auth.");
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Workspace authentication popup error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Retrieve cached access token
 */
export const getWorkspaceAccessToken = (): string | null => {
  return cachedAccessToken;
};

/**
 * Sign out of active Google Workspace session
 */
export const workspaceLogout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// ============================================================================
// GOOGLE TASKS API ACTIONS
// ============================================================================

export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: "needsAction" | "completed";
  due?: string;
}

export interface GoogleTaskList {
  id: string;
  title: string;
}

/**
 * Fetch list of of user's task lists
 */
export async function fetchTaskLists(token: string): Promise<GoogleTaskList[]> {
  const res = await fetch("/api/workspace/proxy", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url: "https://tasks.googleapis.com/v1/users/@default/lists",
      method: "GET"
    })
  });
  if (!res.ok) {
    throw new Error(`Tasks error: ${res.statusText} (${res.status})`);
  }
  const data = await res.json();
  return data.items || [];
}

/**
 * Create a new task list
 */
export async function createTaskList(token: string, title: string): Promise<GoogleTaskList> {
  const res = await fetch("/api/workspace/proxy", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url: "https://tasks.googleapis.com/v1/users/@default/lists",
      method: "POST",
      body: { title }
    })
  });
  if (!res.ok) throw new Error("Failed to create Google Task List");
  return res.json();
}

/**
 * List tasks in a task list
 */
export async function fetchTasks(token: string, listId: string): Promise<GoogleTask[]> {
  const res = await fetch("/api/workspace/proxy", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url: `https://tasks.googleapis.com/v1/lists/${listId}/tasks`,
      method: "GET"
    })
  });
  if (!res.ok) throw new Error("Failed to fetch Google Tasks");
  const data = await res.json();
  return data.items || [];
}

/**
 * Insert a task into a task list
 */
export async function createTask(
  token: string,
  listId: string,
  task: { title: string; notes?: string; due?: string }
): Promise<GoogleTask> {
  const res = await fetch("/api/workspace/proxy", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url: `https://tasks.googleapis.com/v1/lists/${listId}/tasks`,
      method: "POST",
      body: task
    })
  });
  if (!res.ok) throw new Error("Failed to create Google Task");
  return res.json();
}

/**
 * Set a Google Task status (complete/incomplete)
 */
export async function updateTaskStatus(
  token: string,
  listId: string,
  taskId: string,
  completed: boolean
): Promise<GoogleTask> {
  const payload = {
    id: taskId,
    status: completed ? "completed" : "needsAction"
  };
  const res = await fetch("/api/workspace/proxy", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url: `https://tasks.googleapis.com/v1/lists/${listId}/tasks/${taskId}`,
      method: "PATCH",
      body: payload
    })
  });
  if (!res.ok) throw new Error("Failed to update Google Task status");
  return res.json();
}

// ============================================================================
// GOOGLE SHEETS API ACTIONS
// ============================================================================

export interface SpreadsheetCreationResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

/**
 * Exports data to a newly created Google Sheet
 */
export async function exportToGoogleSheets(
  token: string,
  title: string,
  headers: string[],
  rows: any[][]
): Promise<SpreadsheetCreationResult> {
  // 1. Create Spreadsheet
  const createRes = await fetch("/api/workspace/proxy", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url: "https://sheets.googleapis.com/v4/spreadsheets",
      method: "POST",
      body: {
        properties: { title }
      }
    })
  });

  if (!createRes.ok) {
    throw new Error(`Sheets creation error: ${createRes.statusText}`);
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl;

  // 2. Format values matrix
  const values = [headers, ...rows];

  // 3. Write data values
  const writeRes = await fetch("/api/workspace/proxy", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1?valueInputOption=USER_ENTERED`,
      method: "PUT",
      body: {
        range: "Sheet1!A1",
        majorDimension: "ROWS",
        values
      }
    })
  });

  if (!writeRes.ok) {
    throw new Error(`Sheets value update failed: ${writeRes.statusText}`);
  }

  return { spreadsheetId, spreadsheetUrl };
}

// ============================================================================
// GOOGLE SLIDES API ACTIONS
// ============================================================================

export interface PresentationCreationResult {
  presentationId: string;
  presentationUrl: string;
}

/**
 * Exports data to a newly created Google Slides presentation
 */
export async function exportToGoogleSlides(
  token: string,
  title: string,
  slidesData: { title: string; bulletPoints: string[] }[]
): Promise<PresentationCreationResult> {
  // 1. Create presentation
  const createRes = await fetch("/api/workspace/proxy", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url: "https://slides.googleapis.com/v1/presentations",
      method: "POST",
      body: { title }
    })
  });

  if (!createRes.ok) {
    throw new Error(`Slides creation error: ${createRes.statusText}`);
  }

  const presentation = await createRes.json();
  const presentationId = presentation.presentationId;
  const presentationUrl = `https://docs.google.com/presentation/d/${presentationId}/edit`;

  // 2. Generate batch update layout request
  // The first slide is usually the default title slide, we can modify it or create new slides.
  // We will build a batch update request with custom text insertions for each slide.
  const requests: any[] = [];
  
  // Slide insertions
  slidesData.forEach((slide, index) => {
    const slideId = `slide_${index}_id`;
    const titleBoxId = `title_box_${index}_id`;
    const bodyBoxId = `body_box_${index}_id`;

    // Create a new slide with standard TITLE_AND_BODY layout
    requests.push({
      createSlide: {
        objectId: slideId,
        insertionIndex: index + 1,
        slideLayoutReference: {
          predefinedLayout: "TITLE_AND_BODY"
        },
        placeholderIdMappings: [
          {
            layoutPlaceholder: { type: "TITLE", index: 0 },
            objectId: titleBoxId
          },
          {
            layoutPlaceholder: { type: "BODY", index: 0 },
            objectId: bodyBoxId
          }
        ]
      }
    });

    // Populate Slide Title text
    requests.push({
      insertText: {
        objectId: titleBoxId,
        text: slide.title
      }
    });

    // Populate Slide Body bullet points
    const bodyText = slide.bulletPoints.join("\n");
    requests.push({
      insertText: {
        objectId: bodyBoxId,
        text: bodyText
      }
    });

    // We can also apply general styling or list structures if desired, but simple text insertion works beautifully!
  });

  // 3. Dispatch batchUpdate for presentation
  const updateRes = await fetch("/api/workspace/proxy", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url: `https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`,
      method: "POST",
      body: { requests }
    })
  });

  if (!updateRes.ok) {
    throw new Error(`Slides update error: ${updateRes.statusText}`);
  }

  return { presentationId, presentationUrl };
}
