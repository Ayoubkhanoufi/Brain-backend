module.exports = (brain, cb) => {
  brain.lazydb.$register("users", {
    status: { type: String },

    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    image: { type: String },
    email: { type: String, required: true },
    password: { type: String, required: true },

    phoneNumber: { type: String },
    address1: { type: String },
    address2: { type: String },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },

    linkedinId: { type: String },
    github: { type: String },
    linkedin: { type: String },
    twitter: { type: String },
    facebook: { type: String },

    availability: [
      {
        type: Date
      }
    ],

    types: { type: String },

    departments: { type: String },

    skills: [
      {
        type: String
      }
    ],

    technologies: [
      {
        type: String
      }
    ],

    educations: [
      {
        type: String
      }
    ],

    experiences: [
      {
        type: String
      }
    ],

    hobbies: [
      {
        type: String
      }
    ],

    salaryCurrency: {
      type: String
    },
    desiredMinSalary: {
      type: Number
    },
    desiredMaxSalary: {
      type: Number
    },
    salary: {
      type: Number
    },

    isAdmin: {
      type: Boolean,
      default: false
    },

    isSuperSales: {
      type: Boolean,
      default: false
    },

    isSales: {
      type: Boolean,
      default: false
    },

    isChief: {
      type: Boolean,
      default: false
    },

    isCollaborator: {
      type: Boolean,
      default: false
    }
  });

  cb();
};
