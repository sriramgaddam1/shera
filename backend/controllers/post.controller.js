import sharp from "sharp";
import cloudinary from "../utils/cloudinary.js";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";

export const addNewPost = async (req, res) => {
    try {
        const { title, description, category, location } = req.body;
        const image = req.file; 
        const authorId = req.id; 

        // Validate required fields
        if (!title || !description || !category || !location) {
            return res.status(400).json({ message: 'Some fields Are Missing' });
        }

        if (!['Transport', 'Rental', 'Skills'].includes(category)) {
            return res.status(400).json({ message: 'Invalid category' });
        }

        let imageUrl = null;

        // Handle image upload if provided
        if (image) {
            const optimizedImageBuffer = await sharp(image.buffer)
                .resize({ width: 800, height: 800, fit: 'inside' })
                .toFormat('jpeg', { quality: 80 })
                .toBuffer();

            const fileUri = `data:image/jpeg;base64,${optimizedImageBuffer.toString('base64')}`;
            const cloudResponse = await cloudinary.uploader.upload(fileUri);
            imageUrl = cloudResponse.secure_url;
        }

        // Create a new post
        const post = await Post.create({
            title,
            description,
            image: imageUrl,
            category,
            location,
            author: authorId,
        });

        // Update the author's post list
        const user = await User.findById(authorId);
        if (user) {
            user.posts.push(post._id);
            await user.save();
        }

        await post.populate({ path: 'author', select: '-password' });

        return res.status(201).json({
            message: 'New post added',
            post,
            success: true,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Error adding new post',
            success: false,
        });
    }
};

export const getAllPost = async (req, res) => {
    try {
        const posts = await Post.find()
            .sort({ createdAt: -1 }) 
            .populate({ 
                path: 'author', 
                select: 'username profilePicture' 
            })
            .populate({
                path: 'comments',
                options: { sort: { createdAt: -1 } }, 
                populate: {
                    path: 'author',
                    select: 'username profilePicture' 
                }
            });

        return res.status(200).json({
            posts,
            success: true
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Error fetching posts',
            success: false,
        });
    }
};

export const getPostsByCategory = async (req, res) => {
    try {
        const { category, location, status } = req.query;

        // Validate category
        if (!['Transport', 'Rental', 'Skills'].includes(category)) {
            return res.status(400).json({ message: 'Invalid category' });
        }

        // Build the filter object dynamically
        const filter = { category };
        if (location) filter.location = location;
        if (status) filter.status = status;

        const posts = await Post.find(filter)
            .sort({ createdAt: -1 })
            .populate({ path: 'author', select: 'username profilePicture' })
            .populate({
                path: 'comments',
                options: { sort: { createdAt: -1 } },
                populate: { path: 'author', select: 'username profilePicture' }
            });

        return res.status(200).json({
            posts,
            success: true,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Error fetching posts',
            success: false,
        });
    }
};

export const getMyPost = async (req, res) => {//logged in user
    try {
        const authorId = req.id;

        
        const posts = await Post.find({ author: authorId })
            .sort({ createdAt: -1 })
            .populate({
                path: 'author',
                select: 'username profilePicture'
            })
            .populate({
                path: 'comments',
                sort: { createdAt: -1 },
                populate: {
                    path: 'author',
                    select: 'username profilePicture'
                }
            });

        return res.status(200).json({
            posts,
            success: true
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Error fetching posts',
            success: false,
        });
    }
};

export const getUserPosts = async (req, res) => {//other user posts
    try {
        const authorId = req.params.id ;

        const posts = await Post.find({ author: authorId })
            .sort({ createdAt: -1 })
            .populate({
                path: 'author',
                select: 'username profilePicture'
            })
            .populate({
                path: 'comments',
                sort: { createdAt: -1 },
                populate: {
                    path: 'author',
                    select: 'username profilePicture'
                }
            });

        return res.status(200).json({
            posts,
            success: true
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Error fetching posts',
            success: false,
        });
    }
};


export const addComment = async (req,res) =>{
    try {
        const postId = req.params.id;
        const authorId = req.id;//login user id

        const {text} = req.body;

        const post = await Post.findById(postId);

        if(!text) return res.status(400).json({message:'text is required', success:false});

        const comment = await Comment.create({
            text,
            author:authorId,
            post:postId
        })

        await comment.populate({
            path:'author',
            select:"username profilePicture"
        });
        
        post.comments.push(comment._id);
        await post.save();

        return res.status(201).json({
            message:'Comment Added',
            comment,
            success:true
        })

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: 'Error adding comment',
            success: false,
        });
    }
};
export const getCommentsOfPost = async (req,res) => {
    try {
        const postId = req.params.id;

        const comments = await Comment.find({post:postId}).populate('author', 'username profilePicture');

        if(!comments) return res.status(404).json({message:'No comments found for this post', success:false});

        return res.status(200).json({success:true,comments});

    } catch (error) {
        console.log(error);
    }
}
export const deletePost = async (req,res) => {
    try {
        const postId = req.params.id;
        const authorId = req.id;

        const post = await Post.findById(postId);
        if(!post) return res.status(404).json({message:'Post not found', success:false});

        // check if the logged-in user is the owner of the post
        if(post.author.toString() !== authorId) return res.status(403).json({message:'Unauthorized'});

        // delete post
        await Post.findByIdAndDelete(postId);

        // remove the post id from the user's post
        let user = await User.findById(authorId);
        user.posts = user.posts.filter(id => id.toString() !== postId);
        await user.save();

        // delete associated comments
        await Comment.deleteMany({post:postId});

        return res.status(200).json({
            success:true,
            message:'Post deleted'
        })

    } catch (error) {
        console.log(error);
    }
}
export const bookmarkPost = async (req,res) => {
    try {
        const postId = req.params.id;
        const authorId = req.id;
        const post = await Post.findById(postId);
        if(!post) return res.status(404).json({message:'Post not found', success:false});
        
        const user = await User.findById(authorId);
        if(user.bookmarks.includes(post._id)){
            // already bookmarked -> remove from the bookmark
            await user.updateOne({$pull:{bookmarks:post._id}});
            await user.save();
            return res.status(200).json({type:'unsaved', message:'Post removed from bookmark', success:true});

        }else{
            // not bookmarked->add to bookmarks
            await user.updateOne({$addToSet:{bookmarks:post._id}});
            await user.save();
            return res.status(200).json({type:'saved', message:'Post bookmarked', success:true});
        }

    } catch (error) {
        console.log(error);
    }
}

export const editPostStatus = async (req, res) => {
    try {
        const postId = req.params.id;
        const authorId = req.id; // Logged-in user ID

        const { status } = req.body; // New status value

        // Validate the status value
        if (!['Open', 'In Progress', 'Closed'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ message: 'Post not found', success: false });
        }

        // Check if the logged-in user is the author of the post
        if (post.author.toString() !== authorId) {
            return res.status(403).json({ message: 'Unauthorized to edit this post' });
        }

        // Update the post status
        post.status = status;
        await post.save();

        return res.status(200).json({
            message: 'Post status updated successfully',
            post,
            success: true
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Error updating post status',
            success: false
        });
    }
};