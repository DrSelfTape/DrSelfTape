import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../http';
import endPoints from '../../constant';

export const fetchPostsThunk = createAsyncThunk(
  'community/fetchPosts',
  async (params, { rejectWithValue }) => {
    try {
      const query = params?.type ? `?type=${params.type}` : '';
      const { data } = await axios.get(`${endPoints.communityPosts}${query}`);
      return data?.data || data?.results || data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.detail || 'Failed to load posts.'
      );
    }
  }
);

export const createPostThunk = createAsyncThunk(
  'community/createPost',
  async (postData, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(endPoints.communityPosts, postData);
      return data?.data || data;
    } catch (error) {
      const message =
        error?.response?.data?.detail ||
        (error?.response?.data && typeof error.response.data === 'object'
          ? Object.values(error.response.data).flat().join('. ')
          : 'Failed to create post.');
      return rejectWithValue(message);
    }
  }
);

export const likePostThunk = createAsyncThunk(
  'community/likePost',
  async (postId, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(
        `${endPoints.communityPosts}${postId}/like/`
      );
      return { postId, ...(data?.data || data) };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.detail || 'Failed to like post.'
      );
    }
  }
);

export const fetchCommentsThunk = createAsyncThunk(
  'community/fetchComments',
  async (postId, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(
        `${endPoints.communityPosts}${postId}/comments/`
      );
      return { postId, comments: data?.data || data?.results || data };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.detail || 'Failed to load comments.'
      );
    }
  }
);

export const createCommentThunk = createAsyncThunk(
  'community/createComment',
  async ({ postId, content }, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(
        `${endPoints.communityPosts}${postId}/comments/`,
        { content }
      );
      return { postId, comment: data?.data || data };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.detail || 'Failed to add comment.'
      );
    }
  }
);

const initialState = {
  posts: [],
  loading: false,
  createLoading: false,
  error: null,
  commentsByPost: {},
};

const communitySlice = createSlice({
  name: 'community',
  initialState,
  reducers: {
    clearCommunityError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch posts
      .addCase(fetchPostsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPostsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.posts = action.payload;
      })
      .addCase(fetchPostsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create post
      .addCase(createPostThunk.pending, (state) => {
        state.createLoading = true;
      })
      .addCase(createPostThunk.fulfilled, (state, action) => {
        state.createLoading = false;
        state.posts = [action.payload, ...state.posts];
      })
      .addCase(createPostThunk.rejected, (state, action) => {
        state.createLoading = false;
        state.error = action.payload;
      })
      // Like post
      .addCase(likePostThunk.fulfilled, (state, action) => {
        const { postId, liked, likes_count } = action.payload;
        const post = state.posts.find((p) => p.id === postId);
        if (post) {
          post.is_liked_by_me = liked;
          post.likes_count = likes_count;
        }
      })
      // Fetch comments
      .addCase(fetchCommentsThunk.fulfilled, (state, action) => {
        const { postId, comments } = action.payload;
        state.commentsByPost[postId] = comments;
      })
      // Create comment
      .addCase(createCommentThunk.fulfilled, (state, action) => {
        const { postId, comment } = action.payload;
        if (!state.commentsByPost[postId]) {
          state.commentsByPost[postId] = [];
        }
        state.commentsByPost[postId].push(comment);
        const post = state.posts.find((p) => p.id === postId);
        if (post) {
          post.comment_count = (post.comment_count || 0) + 1;
        }
      });
  },
});

export const { clearCommunityError } = communitySlice.actions;
export default communitySlice.reducer;
