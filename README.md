# Task Manager (Kanban Board)

A Kanban-style task management application built with Next.js and Supabase.

This app allows users to create, manage, and organize tasks across different workflow stages, with support for team members and task assignments.

---

## 🛠 Tech Stack

- **Frontend:** Next.js (App Router), React, TypeScript  
- **Styling:** Tailwind CSS  
- **Drag & Drop:** dnd-kit  
- **Backend / Database:** Supabase  
- **Authentication:** Supabase Anonymous Auth  

---

## ✨ Features

### Task Management
- Create tasks
- Edit task details (title, description, priority, due date)
- Delete tasks
- Persist tasks in Supabase

### Kanban Board
- Four columns: To Do, In Progress, In Review, Done
- Drag and drop tasks between columns
- Status updates on drop

### Team Members & Assignments
- Create team members
- Assign one or more members to a task
- Display assigned members on task cards

### Filtering & Search
- Search tasks by title or description
- Filter tasks by priority

### Guest Authentication
- Users are automatically signed in anonymously
- Each user only sees their own data
- Data isolation enforced using Supabase Row Level Security (RLS)



