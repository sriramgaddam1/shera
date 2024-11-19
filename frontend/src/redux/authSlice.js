import { createSlice } from "@reduxjs/toolkit";

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
  },
  reducers: {
    setAuthUser: (state, action) => {
      state.user = action.payload;
    },
    updateBookmarks: (state, action) => {
      const { postId, isBookmarked } = action.payload;
      if (state.user) {
        if (isBookmarked) {
          state.user.bookmarks.push(postId);
        } else {
          state.user.bookmarks = state.user.bookmarks.filter(id => id !== postId);
        }
      }
    },
    setUserProfile: (state, action) => {
      state.userProfile = action.payload;
    },
    setSelectedUser: (state, action) => {
      state.selectedUser = action.payload;
    },
  }
})

export const {
  setAuthUser,
  updateBookmarks,
  setUserProfile,
  setSelectedUser
} = authSlice.actions;

export default authSlice.reducer;