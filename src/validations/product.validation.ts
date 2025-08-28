import * as yup from "yup";

// Validation pour la création d'un produit
export const createProductSchema = yup.object().shape({
  name: yup.string().required("Le nom est requis"),
  price: yup
    .number()
    .typeError("Le prix doit être un nombre")
    .required("Le prix est requis"),
  quantity: yup
    .number()
    .typeError("La quantité doit être un nombre")
    .required("La quantité est requise"),
  description: yup.string().required("La description est requise"),
  categoryId: yup.string().required("La catégorie est requise"),
  cityId: yup.string().required("La ville est requise"),
  etat: yup.string().required("L'état est requis"),
  quartier: yup.string().nullable(),
  telephone: yup.string().nullable(),
  forfaitType: yup.string().nullable(),
  images: yup
    .array()
    .of(yup.mixed())
    .min(1, "Au moins une image est requise")
    .max(5, "Maximum 5 images"),
});

// Validation pour la revue d'un produit (validation/rejet)
export const reviewProductSchema = yup.object().shape({
  action: yup
    .string()
    .oneOf(["validate", "reject"], "Action invalide")
    .required("L'action est requise"),
});

