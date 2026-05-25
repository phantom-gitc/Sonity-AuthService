import mongoose from "mongoose";

 
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  fullName: {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: function() { return !this.googleId; },
    },
  },

  password:{
    type: String,
    required: function() { return !this.googleId; },
  },
  googleId: {
    type: String,
  },
  role:{
    type:String,
    enum:["listener","creator","user","artist","admin"],
    default:"listener"
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  },
  profileImage: {
    type: String,
    default: null
  },
  profileImagePublicId: {
    type: String,
    default: null
  }
},{timestamps :true});


const userModel = mongoose.model('user',userSchema);


export default userModel;