const cloudinary = require("../config/cloudinary");

//  Upload une ou plusieurs images → retourne les URLs Cloudinary
const uploadImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ message: "Aucune image reçue" });

    // Multer-storage-cloudinary a déjà uploadé les fichiers
    // req.files contient les infos de chaque fichier
    const urls = req.files.map((file) => file.path); // path = URL Cloudinary

    res.json({ urls });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//  Supprimer une image de Cloudinary
const deleteImage = async (req, res) => {
  try {
    const { publicId } = req.body;
    if (!publicId) return res.status(400).json({ message: "publicId requis" });

    await cloudinary.uploader.destroy(publicId);
    res.json({ message: "Image supprimée" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { uploadImages, deleteImage };
