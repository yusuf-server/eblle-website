/**
 * 静态 UI 文本翻译字典
 * 包含按钮、标签、导航等固定文本
 */

import type { SupportedLocale } from './utils';

export interface UITranslations {
  // 导航
  nav: {
    home: string;
    shop: string;
    about: string;
    contact: string;
    cart: string;
    search: string;
    newArrival: string;
    bestSellers: string;
    factory: string;
    allCategories: string;
    aboutEbBelle: string;
    contactUs: string;
    orderTracking: string;
    menu: string;
  };

  // 产品页面
  product: {
    addToCart: string;
    buyNow: string;
    quantity: string;
    inStock: string;
    outOfStock: string;
    selectOptions: string;
    description: string;
    details: string;
    specifications: string;
    reviews: string;
    relatedProducts: string;
    youMayAlsoLike: string;
    home: string;
    size: string;
    color: string;
    material: string;
    selectSize: string;
    selectColor: string;
    freeShipping: string;
    giftPackaging: string;
  };

  // 购物车
  cart: {
    title: string;
    empty: string;
    subtotal: string;
    total: string;
    checkout: string;
    continueShopping: string;
    remove: string;
    updateCart: string;
    itemsInBag: string;
    promoCode: string;
    enterCouponCode: string;
    apply: string;
    orderSummary: string;
    shipping: string;
    estimatedTax: string;
    estimatedTotal: string;
    proceedToCheckout: string;
    clearAll: string;
    product: string;
    price: string;
    quantity: string;
    weAccept: string;
    safeCheckout: string;
  };

  // 商店页面
  shop: {
    filters: string;
    sortBy: string;
    showing: string;
    products: string;
    priceRange: string;
    categories: string;
    colors: string;
    materials: string;
    applyFilters: string;
    clearFilters: string;
    noProductsFound: string;
    loadMore: string;
    // 排序选项
    sortFeatured: string;
    sortPriceAsc: string;
    sortPriceDesc: string;
    sortNewest: string;
    sortPopular: string;
    // 视图切换
    gridView: string;
    listView: string;
  };

  // 结账
  checkout: {
    title: string;
    shippingAddress: string;
    billingAddress: string;
    paymentMethod: string;
    placeOrder: string;
    orderSummary: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    continueToPayment: string;
    continueShopping: string;
    orderConfirmed: string;
    thankYouForPurchase: string;
    orderNumber: string;
    orderDate: string;
    total: string;
    subtotal: string;
    shipping: string;
    tax: string;
    creditCard: string;
    paypal: string;
  };

  // 通用
  common: {
    loading: string;
    error: string;
    success: string;
    close: string;
    cancel: string;
    confirm: string;
    save: string;
    edit: string;
    delete: string;
    search: string;
    filter: string;
    sortBy: string;
    showMore: string;
    showLess: string;
  };

  // 页脚
  footer: {
    aboutUs: string;
    customerService: string;
    followUs: string;
    newsletter: string;
    subscribeNewsletter: string;
    enterEmail: string;
    subscribe: string;
    allRightsReserved: string;
    newsletterHeading: string;
    emailPlaceholder: string;
    privacyAgreement: string;
    securityPrivacy: string;
    help: string;
    moreInfo: string;
    faqs: string;
    shipping: string;
    returns: string;
    materialsCare: string;
    ringSizeGuide: string;
    sizeGuide: string;
    contactUs: string;
    about: string;
    showroom: string;
    wholesale: string;
    dropshipping: string;
    oemOdm: string;
    blog: string;
    offers: string;
    terms: string;
    privacy: string;
    collection: string;
    product: string;
    trackingOrder: string;
    copyright: string;
  };

  // SEO
  seo: {
    homeTitle: string;
    homeDescription: string;
    shopTitle: string;
    shopDescription: string;
  };

  // CartDrawer
  cartDrawer: {
    title: string;
    freeShippingProgress: string;
    freeShippingAchieved: string;
    current: string;
    goal: string;
    estimatedTax: string;
    calculatedAtCheckout: string;
    shipping: string;
    calculatedNextStep: string;
    subtotal: string;
    checkout: string;
    viewCart: string;
    secureCheckout: string;
    emptyCart: string;
    continueShopping: string;
  };

  // Auth Modal
  auth: {
    signIn: string;
    createAccount: string;
    continueWithGoogle: string;
    signUpWithGoogle: string;
    orContinueWithEmail: string;
    emailAddress: string;
    emailPlaceholder: string;
    password: string;
    passwordPlaceholder: string;
    createPassword: string;
    passwordMinLength: string;
    rememberMe: string;
    forgotPassword: string;
    signInButton: string;
    firstName: string;
    lastName: string;
    firstNamePlaceholder: string;
    lastNamePlaceholder: string;
    termsAgreement: string;
    terms: string;
    privacyPolicy: string;
    joinButton: string;
    brandDescription: string;
    perk1: string;
    perk2: string;
    perk3: string;
    perk4: string;
    perk5: string;
  };

  // Mobile Menu
  mobileMenu: {
    home: string;
    category: string;
    wishlist: string;
    cart: string;
    account: string;
  };
}

export const translations: Record<SupportedLocale, UITranslations> = {
  en: {
    nav: {
      home: 'Home',
      shop: 'Shop',
      about: 'About',
      contact: 'Contact',
      cart: 'Cart',
      search: 'Search',
      newArrival: 'NEW ARRIVAL',
      bestSellers: 'BEST SELLERS',
      factory: 'FACTORY',
      allCategories: 'ALL CATEGORIES',
      aboutEbBelle: 'ABOUT E.B.BELLE',
      contactUs: 'CONTACT US',
      orderTracking: 'Order Tracking',
      menu: 'MENU'
    },
    product: {
      addToCart: 'Add to Cart',
      buyNow: 'Buy Now',
      quantity: 'Quantity',
      inStock: 'In Stock',
      outOfStock: 'Out of Stock',
      selectOptions: 'Select Options',
      description: 'Description',
      details: 'Details',
      specifications: 'Specifications',
      reviews: 'Reviews',
      relatedProducts: 'Related Products',
      youMayAlsoLike: 'You May Also Like',
      home: 'Home',
      size: 'Size',
      color: 'Color',
      material: 'Material',
      selectSize: 'Select Size',
      selectColor: 'Select Color',
      freeShipping: 'Free Shipping',
      giftPackaging: 'Gift Packaging Available'
    },
    cart: {
      title: 'Shopping Cart',
      empty: 'Your cart is empty',
      subtotal: 'Subtotal',
      total: 'Total',
      checkout: 'Checkout',
      continueShopping: 'Continue Shopping',
      remove: 'Remove',
      updateCart: 'Update Cart',
      itemsInBag: '{{count}} items in your bag',
      promoCode: 'Promo Code',
      enterCouponCode: 'Enter coupon code',
      apply: 'Apply',
      orderSummary: 'Order Summary',
      shipping: 'Shipping',
      estimatedTax: 'Estimated Tax',
      estimatedTotal: 'Estimated Total',
      proceedToCheckout: 'PROCEED TO CHECKOUT',
      clearAll: 'Clear All',
      product: 'Product',
      price: 'Price',
      quantity: 'Quantity',
      weAccept: 'WE ACCEPT',
      safeCheckout: 'Guaranteed safe & secure checkout'
    },
    shop: {
      filters: 'Filters',
      sortBy: 'Sort by',
      showing: 'Showing',
      products: 'products',
      priceRange: 'Price Range',
      categories: 'Categories',
      colors: 'Colors',
      materials: 'Materials',
      applyFilters: 'Apply Filters',
      clearFilters: 'Clear All',
      noProductsFound: 'No products found',
      loadMore: 'Load More',
      sortFeatured: 'Featured',
      sortPriceAsc: 'Price: Low to High',
      sortPriceDesc: 'Price: High to Low',
      sortNewest: 'Newest',
      sortPopular: 'Most Popular',
      gridView: 'Grid View',
      listView: 'List View'
    },
    checkout: {
      title: 'Checkout',
      shippingAddress: 'Shipping Address',
      billingAddress: 'Billing Address',
      paymentMethod: 'Payment Method',
      placeOrder: 'Place Order',
      orderSummary: 'Order Summary',
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email',
      phone: 'Phone',
      address: 'Address',
      city: 'City',
      state: 'State',
      zipCode: 'ZIP Code',
      country: 'Country',
      continueToPayment: 'Continue to Payment',
      continueShopping: 'Continue Shopping',
      orderConfirmed: 'Order Confirmed!',
      thankYouForPurchase: 'Thank you for your purchase',
      orderNumber: 'Order Number',
      orderDate: 'Order Date',
      total: 'Total',
      subtotal: 'Subtotal',
      shipping: 'Shipping',
      tax: 'Tax',
      creditCard: 'Credit Card',
      paypal: 'PayPal'
    },
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      close: 'Close',
      cancel: 'Cancel',
      confirm: 'Confirm',
      save: 'Save',
      edit: 'Edit',
      delete: 'Delete',
      search: 'Search',
      filter: 'Filter',
      sortBy: 'Sort by',
      showMore: 'Show More',
      showLess: 'Show Less'
    },
    footer: {
      aboutUs: 'About Us',
      customerService: 'Customer Service',
      followUs: 'Follow Us',
      newsletter: 'Newsletter',
      subscribeNewsletter: 'Subscribe to our newsletter',
      enterEmail: 'Enter your email',
      subscribe: 'Subscribe',
      allRightsReserved: 'All rights reserved',
      newsletterHeading: 'GET 10% OFF YOUR FIRST ORDER',
      emailPlaceholder: 'Enter your email address',
      privacyAgreement: 'By get 10% off, you agree to our',
      securityPrivacy: 'Security & Privacy',
      help: 'HELP',
      moreInfo: 'MORE INFO',
      faqs: 'FAQs',
      shipping: 'Shipping',
      returns: 'Returns',
      materialsCare: 'Materials & Care',
      ringSizeGuide: 'Ring Size Guide',
      sizeGuide: 'Size Guide',
      contactUs: 'Contact Us',
      about: 'About E.B.belle',
      showroom: 'Our Showroom',
      wholesale: 'Wholesale',
      dropshipping: 'Dropshipping',
      oemOdm: 'OEM & ODM',
      blog: 'Blog',
      offers: 'Offers & Promos',
      terms: 'Terms & Conditions',
      privacy: 'Privacy & Security',
      collection: 'Collection',
      product: 'Product',
      trackingOrder: 'Tracking order',
      copyright: '© 2026 E.B.belle Limited. All rights reserved.'
    },
    seo: {
      homeTitle: 'E.B.Belle - Elegant Jewelry & Accessories',
      homeDescription: 'Discover our collection of elegant jewelry and accessories. High-quality craftsmanship and timeless designs.',
      shopTitle: 'Shop All Jewelry - E.B.Belle',
      shopDescription: 'Browse our complete collection of elegant jewelry, including necklaces, earrings, bracelets, and rings.'
    },
    cartDrawer: {
      title: 'Shopping Cart',
      freeShippingProgress: "You're <span class=\"highlight\">$50.00</span> away from <strong>FREE SHIPPING!</strong>",
      freeShippingAchieved: '<strong>Congratulations! You\'ve unlocked FREE SHIPPING!</strong>',
      current: 'CURRENT',
      goal: 'GOAL',
      estimatedTax: 'Estimated Tax',
      calculatedAtCheckout: 'Calculated at checkout',
      shipping: 'Shipping',
      calculatedNextStep: 'Calculated next step',
      subtotal: 'Subtotal',
      checkout: 'CHECKOUT',
      viewCart: 'VIEW CART',
      secureCheckout: 'SECURE CHECKOUT GUARANTEED',
      emptyCart: 'Your cart is currently empty',
      continueShopping: 'CONTINUE SHOPPING'
    },
    auth: {
      signIn: 'Sign In',
      createAccount: 'Create Account',
      continueWithGoogle: 'Continue with Google',
      signUpWithGoogle: 'Sign up with Google',
      orContinueWithEmail: 'or continue with email',
      emailAddress: 'Email Address',
      emailPlaceholder: 'name@example.com',
      password: 'Password',
      passwordPlaceholder: '••••••••',
      createPassword: 'Create Password',
      passwordMinLength: 'Min. 8 characters',
      rememberMe: 'Remember me',
      forgotPassword: 'Forgot password?',
      signInButton: 'SIGN IN',
      firstName: 'First Name',
      lastName: 'Last Name',
      firstNamePlaceholder: 'John',
      lastNamePlaceholder: 'Doe',
      termsAgreement: 'By creating an account, you agree to our',
      terms: 'Terms',
      privacyPolicy: 'Privacy Policy',
      joinButton: 'JOIN E.B.BELLE',
      brandDescription: 'Fine Jewelry & Timeless Elegance',
      perk1: 'Exclusive member rewards and early access',
      perk2: 'Save favorites and build your wishlist',
      perk3: 'Track orders and view purchase history',
      perk4: 'Special promotions and birthday discounts',
      perk5: 'Multiple secure encrypted payment gateways'
    },
    mobileMenu: {
      home: 'Home',
      category: 'Category',
      wishlist: 'Wishlist',
      cart: 'Cart',
      account: 'Account'
    }
  },

  fr: {
    nav: {
      home: 'Accueil',
      shop: 'Boutique',
      about: 'À propos',
      contact: 'Contact',
      cart: 'Panier',
      search: 'Rechercher',
      newArrival: 'NOUVEAUTÉS',
      bestSellers: 'MEILLEURES VENTES',
      factory: 'USINE',
      allCategories: 'TOUTES LES CATÉGORIES',
      aboutEbBelle: 'À PROPOS D\'E.B.BELLE',
      contactUs: 'CONTACTEZ-NOUS',
      orderTracking: 'Suivi de commande',
      menu: 'MENU'
    },
    product: {
      addToCart: 'Ajouter au panier',
      buyNow: 'Acheter maintenant',
      quantity: 'Quantité',
      inStock: 'En stock',
      outOfStock: 'Rupture de stock',
      selectOptions: 'Sélectionner les options',
      description: 'Description',
      details: 'Détails',
      specifications: 'Spécifications',
      reviews: 'Avis',
      relatedProducts: 'Produits connexes',
      youMayAlsoLike: 'Vous aimerez aussi',
      home: 'Accueil',
      size: 'Taille',
      color: 'Couleur',
      material: 'Matériau',
      selectSize: 'Sélectionner la taille',
      selectColor: 'Sélectionner la couleur',
      freeShipping: 'Livraison gratuite',
      giftPackaging: 'Emballage cadeau disponible'
    },
    cart: {
      title: 'Panier',
      empty: 'Votre panier est vide',
      subtotal: 'Sous-total',
      total: 'Total',
      checkout: 'Passer la commande',
      continueShopping: 'Continuer vos achats',
      remove: 'Supprimer',
      updateCart: 'Mettre à jour le panier',
      itemsInBag: '{{count}} articles dans votre panier',
      promoCode: 'Code promo',
      enterCouponCode: 'Entrez le code promo',
      apply: 'Appliquer',
      orderSummary: 'Résumé de la commande',
      shipping: 'Livraison',
      estimatedTax: 'Taxe estimée',
      estimatedTotal: 'Total estimé',
      proceedToCheckout: 'PASSER LA COMMANDE',
      clearAll: 'Tout effacer',
      product: 'Produit',
      price: 'Prix',
      quantity: 'Quantité',
      weAccept: 'NOUS ACCEPTONS',
      safeCheckout: 'Paiement sûr et sécurisé garanti'
    },
    shop: {
      filters: 'Filtres',
      sortBy: 'Trier par',
      showing: 'Affichage',
      products: 'produits',
      priceRange: 'Gamme de prix',
      categories: 'Catégories',
      colors: 'Couleurs',
      materials: 'Matériaux',
      applyFilters: 'Appliquer les filtres',
      clearFilters: 'Tout effacer',
      noProductsFound: 'Aucun produit trouvé',
      loadMore: 'Charger plus',
      sortFeatured: 'En vedette',
      sortPriceAsc: 'Prix: Croissant',
      sortPriceDesc: 'Prix: Décroissant',
      sortNewest: 'Nouveautés',
      sortPopular: 'Populaire',
      gridView: 'Vue grille',
      listView: 'Vue liste'
    },
    checkout: {
      title: 'Paiement',
      shippingAddress: 'Adresse de livraison',
      billingAddress: 'Adresse de facturation',
      paymentMethod: 'Méthode de paiement',
      placeOrder: 'Passer la commande',
      orderSummary: 'Récapitulatif',
      firstName: 'Prénom',
      lastName: 'Nom',
      email: 'E-mail',
      phone: 'Téléphone',
      address: 'Adresse',
      city: 'Ville',
      state: 'Région',
      zipCode: 'Code postal',
      country: 'Pays',
      continueToPayment: 'Continuer vers le paiement',
      continueShopping: 'Continuer les achats',
      orderConfirmed: 'Commande confirmée !',
      thankYouForPurchase: 'Merci pour votre achat',
      orderNumber: 'Numéro de commande',
      orderDate: 'Date de commande',
      total: 'Total',
      subtotal: 'Sous-total',
      shipping: 'Livraison',
      tax: 'Taxe',
      creditCard: 'Carte de crédit',
      paypal: 'PayPal'
    },
    common: {
      loading: 'Chargement...',
      error: 'Erreur',
      success: 'Succès',
      close: 'Fermer',
      cancel: 'Annuler',
      confirm: 'Confirmer',
      save: 'Enregistrer',
      edit: 'Modifier',
      delete: 'Supprimer',
      search: 'Rechercher',
      filter: 'Filtrer',
      sortBy: 'Trier par',
      showMore: 'Afficher plus',
      showLess: 'Afficher moins'
    },
    footer: {
      aboutUs: 'À propos',
      customerService: 'Service client',
      followUs: 'Suivez-nous',
      newsletter: 'Newsletter',
      subscribeNewsletter: 'Abonnez-vous à notre newsletter',
      enterEmail: 'Entrez votre e-mail',
      subscribe: 'S\'abonner',
      allRightsReserved: 'Tous droits réservés',
      newsletterHeading: 'OBTENEZ 10% DE RÉDUCTION SUR VOTRE PREMIÈRE COMMANDE',
      emailPlaceholder: 'Entrez votre adresse e-mail',
      privacyAgreement: 'En obtenant 10% de réduction, vous acceptez notre',
      securityPrivacy: 'Sécurité et confidentialité',
      help: 'AIDE',
      moreInfo: 'PLUS D\'INFO',
      faqs: 'FAQ',
      shipping: 'Livraison',
      returns: 'Retours',
      materialsCare: 'Matériaux et entretien',
      ringSizeGuide: 'Guide des tailles de bague',
      sizeGuide: 'Guide des tailles',
      contactUs: 'Nous contacter',
      about: 'À propos d\'E.B.belle',
      showroom: 'Notre showroom',
      wholesale: 'Gros',
      dropshipping: 'Dropshipping',
      oemOdm: 'OEM & ODM',
      blog: 'Blog',
      offers: 'Offres et promotions',
      terms: 'Conditions générales',
      privacy: 'Confidentialité et sécurité',
      collection: 'Collection',
      product: 'Produit',
      trackingOrder: 'Suivi de commande',
      copyright: '© 2026 E.B.belle Limited. Tous droits réservés.'
    },
    seo: {
      homeTitle: 'E.B.Belle - Bijoux et Accessoires Élégants',
      homeDescription: 'Découvrez notre collection de bijoux et accessoires élégants. Artisanat de haute qualité et designs intemporels.',
      shopTitle: 'Boutique de Bijoux - E.B.Belle',
      shopDescription: 'Parcourez notre collection complète de bijoux élégants, y compris colliers, boucles d\'oreilles, bracelets et bagues.'
    },
    cartDrawer: {
      title: 'Panier',
      freeShippingProgress: "Il vous reste <span class=\"highlight\">50,00€</span> pour bénéficier de la <strong>LIVRAISON GRATUITE!</strong>",
      freeShippingAchieved: '<strong>Félicitations! Vous avez débloqué la LIVRAISON GRATUITE!</strong>',
      current: 'ACTUEL',
      goal: 'OBJECTIF',
      estimatedTax: 'Taxe estimée',
      calculatedAtCheckout: 'Calculé à la caisse',
      shipping: 'Livraison',
      calculatedNextStep: 'Calculé à l\'étape suivante',
      subtotal: 'Sous-total',
      checkout: 'PASSER LA COMMANDE',
      viewCart: 'VOIR LE PANIER',
      secureCheckout: 'PAIEMENT SÉCURISÉ GARANTI',
      emptyCart: 'Votre panier est actuellement vide',
      continueShopping: 'CONTINUER VOS ACHATS'
    },
    auth: {
      signIn: 'Se connecter',
      createAccount: 'Créer un compte',
      continueWithGoogle: 'Continuer avec Google',
      signUpWithGoogle: 'S\'inscrire avec Google',
      orContinueWithEmail: 'ou continuer avec e-mail',
      emailAddress: 'Adresse e-mail',
      emailPlaceholder: 'nom@exemple.com',
      password: 'Mot de passe',
      passwordPlaceholder: '••••••••',
      createPassword: 'Créer un mot de passe',
      passwordMinLength: 'Min. 8 caractères',
      rememberMe: 'Se souvenir de moi',
      forgotPassword: 'Mot de passe oublié?',
      signInButton: 'SE CONNECTER',
      firstName: 'Prénom',
      lastName: 'Nom',
      firstNamePlaceholder: 'Jean',
      lastNamePlaceholder: 'Dupont',
      termsAgreement: 'En créant un compte, vous acceptez nos',
      terms: 'Conditions',
      privacyPolicy: 'Politique de confidentialité',
      joinButton: 'REJOINDRE E.B.BELLE',
      brandDescription: 'Bijoux Fins & Élégance Intemporelle',
      perk1: 'Récompenses exclusives et accès anticipé',
      perk2: 'Enregistrer vos favoris et créer votre liste de souhaits',
      perk3: 'Suivre les commandes et voir l\'historique d\'achat',
      perk4: 'Promotions spéciales et réductions d\'anniversaire',
      perk5: 'Plusieurs passerelles de paiement cryptées sécurisées'
    },
    mobileMenu: {
      home: 'Accueil',
      category: 'Catégorie',
      wishlist: 'Favoris',
      cart: 'Panier',
      account: 'Compte'
    }
  },

  de: {
    nav: {
      home: 'Startseite',
      shop: 'Shop',
      about: 'Über uns',
      contact: 'Kontakt',
      cart: 'Warenkorb',
      search: 'Suchen',
      newArrival: 'NEUHEITEN',
      bestSellers: 'BESTSELLER',
      factory: 'FABRIK',
      allCategories: 'ALLE KATEGORIEN',
      aboutEbBelle: 'ÜBER E.B.BELLE',
      contactUs: 'KONTAKTIEREN SIE UNS',
      orderTracking: 'Bestellverfolgung',
      menu: 'MENÜ'
    },
    product: {
      addToCart: 'In den Warenkorb',
      buyNow: 'Jetzt kaufen',
      quantity: 'Menge',
      inStock: 'Auf Lager',
      outOfStock: 'Ausverkauft',
      selectOptions: 'Optionen wählen',
      description: 'Beschreibung',
      details: 'Details',
      specifications: 'Spezifikationen',
      reviews: 'Bewertungen',
      relatedProducts: 'Ähnliche Produkte',
      youMayAlsoLike: 'Das könnte Ihnen auch gefallen',
      home: 'Startseite',
      size: 'Größe',
      color: 'Farbe',
      material: 'Material',
      selectSize: 'Größe wählen',
      selectColor: 'Farbe wählen',
      freeShipping: 'Kostenloser Versand',
      giftPackaging: 'Geschenkverpackung verfügbar'
    },
    cart: {
      title: 'Warenkorb',
      empty: 'Ihr Warenkorb ist leer',
      subtotal: 'Zwischensumme',
      total: 'Gesamt',
      checkout: 'Zur Kasse',
      continueShopping: 'Weiter einkaufen',
      remove: 'Entfernen',
      updateCart: 'Warenkorb aktualisieren',
      itemsInBag: '{{count}} Artikel in Ihrem Warenkorb',
      promoCode: 'Aktionscode',
      enterCouponCode: 'Gutscheincode eingeben',
      apply: 'Anwenden',
      orderSummary: 'Bestellübersicht',
      shipping: 'Versand',
      estimatedTax: 'Geschätzte Steuer',
      estimatedTotal: 'Geschätzte Gesamtsumme',
      proceedToCheckout: 'ZUR KASSE GEHEN',
      clearAll: 'Alle löschen',
      product: 'Produkt',
      price: 'Preis',
      quantity: 'Menge',
      weAccept: 'WIR AKZEPTIEREN',
      safeCheckout: 'Garantiert sicherer Checkout'
    },
    shop: {
      filters: 'Filter',
      sortBy: 'Sortieren nach',
      showing: 'Anzeigen',
      products: 'Produkte',
      priceRange: 'Preisspanne',
      categories: 'Kategorien',
      colors: 'Farben',
      materials: 'Materialien',
      applyFilters: 'Filter anwenden',
      clearFilters: 'Alle löschen',
      noProductsFound: 'Keine Produkte gefunden',
      loadMore: 'Mehr laden',
      sortFeatured: 'Empfohlen',
      sortPriceAsc: 'Preis: Aufsteigend',
      sortPriceDesc: 'Preis: Absteigend',
      sortNewest: 'Neueste',
      sortPopular: 'Beliebt',
      gridView: 'Rasteransicht',
      listView: 'Listenansicht'
    },
    checkout: {
      title: 'Kasse',
      shippingAddress: 'Lieferadresse',
      billingAddress: 'Rechnungsadresse',
      paymentMethod: 'Zahlungsmethode',
      placeOrder: 'Bestellung aufgeben',
      orderSummary: 'Bestellübersicht',
      firstName: 'Vorname',
      lastName: 'Nachname',
      email: 'E-Mail',
      phone: 'Telefon',
      address: 'Adresse',
      city: 'Stadt',
      state: 'Bundesland',
      zipCode: 'Postleitzahl',
      country: 'Land',
      continueToPayment: 'Zur Zahlung',
      continueShopping: 'Weiter einkaufen',
      orderConfirmed: 'Bestellung bestätigt!',
      thankYouForPurchase: 'Vielen Dank für Ihren Einkauf',
      orderNumber: 'Bestellnummer',
      orderDate: 'Bestelldatum',
      total: 'Gesamt',
      subtotal: 'Zwischensumme',
      shipping: 'Versand',
      tax: 'Steuer',
      creditCard: 'Kreditkarte',
      paypal: 'PayPal'
    },
    common: {
      loading: 'Lädt...',
      error: 'Fehler',
      success: 'Erfolg',
      close: 'Schließen',
      cancel: 'Abbrechen',
      confirm: 'Bestätigen',
      save: 'Speichern',
      edit: 'Bearbeiten',
      delete: 'Löschen',
      search: 'Suchen',
      filter: 'Filtern',
      sortBy: 'Sortieren nach',
      showMore: 'Mehr anzeigen',
      showLess: 'Weniger anzeigen'
    },
    footer: {
      aboutUs: 'Über uns',
      customerService: 'Kundenservice',
      followUs: 'Folgen Sie uns',
      newsletter: 'Newsletter',
      subscribeNewsletter: 'Abonnieren Sie unseren Newsletter',
      enterEmail: 'E-Mail eingeben',
      subscribe: 'Abonnieren',
      allRightsReserved: 'Alle Rechte vorbehalten',
      newsletterHeading: 'ERHALTEN SIE 10% RABATT AUF IHRE ERSTE BESTELLUNG',
      emailPlaceholder: 'Geben Sie Ihre E-Mail-Adresse ein',
      privacyAgreement: 'Indem Sie 10% Rabatt erhalten, stimmen Sie unseren zu',
      securityPrivacy: 'Sicherheit & Datenschutz',
      help: 'HILFE',
      moreInfo: 'MEHR INFO',
      faqs: 'Häufig gestellte Fragen',
      shipping: 'Versand',
      returns: 'Rücksendungen',
      materialsCare: 'Materialien & Pflege',
      ringSizeGuide: 'Ringgrößenführer',
      sizeGuide: 'Größenführer',
      contactUs: 'Kontaktieren Sie uns',
      about: 'Über E.B.belle',
      showroom: 'Unser Showroom',
      wholesale: 'Großhandel',
      dropshipping: 'Dropshipping',
      oemOdm: 'OEM & ODM',
      blog: 'Blog',
      offers: 'Angebote & Aktionen',
      terms: 'Geschäftsbedingungen',
      privacy: 'Datenschutz & Sicherheit',
      collection: 'Kollektion',
      product: 'Produkt',
      trackingOrder: 'Bestellverfolgung',
      copyright: '© 2026 E.B.belle Limited. Alle Rechte vorbehalten.'
    },
    seo: {
      homeTitle: 'E.B.Belle - Eleganter Schmuck & Accessoires',
      homeDescription: 'Entdecken Sie unsere Kollektion eleganter Schmuck und Accessoires. Hochwertige Handwerkskunst und zeitlose Designs.',
      shopTitle: 'Schmuck Shop - E.B.Belle',
      shopDescription: 'Durchstöbern Sie unsere komplette Kollektion eleganten Schmucks, einschließlich Halsketten, Ohrringe, Armbänder und Ringe.'
    },
    cartDrawer: {
      title: 'Warenkorb',
      freeShippingProgress: "Sie sind <span class=\"highlight\">50,00€</span> von <strong>KOSTENLOSEM VERSAND!</strong> entfernt",
      freeShippingAchieved: '<strong>Glückwunsch! Sie haben KOSTENLOSEN VERSAND freigeschaltet!</strong>',
      current: 'AKTUELL',
      goal: 'ZIEL',
      estimatedTax: 'Geschätzte Steuer',
      calculatedAtCheckout: 'Bei Kasse berechnet',
      shipping: 'Versand',
      calculatedNextStep: 'Im nächsten Schritt berechnet',
      subtotal: 'Zwischensumme',
      checkout: 'ZUR KASSE',
      viewCart: 'WARENKORB ANSEHEN',
      secureCheckout: 'SICHERE ZAHLUNG GARANTIERT',
      emptyCart: 'Ihr Warenkorb ist derzeit leer',
      continueShopping: 'WEITER EINKAUFEN'
    },
    auth: {
      signIn: 'Anmelden',
      createAccount: 'Konto erstellen',
      continueWithGoogle: 'Mit Google fortfahren',
      signUpWithGoogle: 'Mit Google registrieren',
      orContinueWithEmail: 'oder mit E-Mail fortfahren',
      emailAddress: 'E-Mail-Adresse',
      emailPlaceholder: 'name@beispiel.com',
      password: 'Passwort',
      passwordPlaceholder: '••••••••',
      createPassword: 'Passwort erstellen',
      passwordMinLength: 'Min. 8 Zeichen',
      rememberMe: 'Angemeldet bleiben',
      forgotPassword: 'Passwort vergessen?',
      signInButton: 'ANMELDEN',
      firstName: 'Vorname',
      lastName: 'Nachname',
      firstNamePlaceholder: 'Hans',
      lastNamePlaceholder: 'Schmidt',
      termsAgreement: 'Durch die Erstellung eines Kontos stimmen Sie unseren zu',
      terms: 'Bedingungen',
      privacyPolicy: 'Datenschutzrichtlinie',
      joinButton: 'E.B.BELLE BEITRETEN',
      brandDescription: 'Feiner Schmuck & Zeitlose Eleganz',
      perk1: 'Exklusive Mitgliederprämien und früher Zugang',
      perk2: 'Favoriten speichern und Wunschliste erstellen',
      perk3: 'Bestellungen verfolgen und Kaufhistorie einsehen',
      perk4: 'Sonderaktionen und Geburtstagsrabatte',
      perk5: 'Mehrere sichere verschlüsselte Zahlungsgateways'
    },
    mobileMenu: {
      home: 'Startseite',
      category: 'Kategorie',
      wishlist: 'Wunschliste',
      cart: 'Warenkorb',
      account: 'Konto'
    }
  },

  es: {
    nav: {
      home: 'Inicio',
      shop: 'Tienda',
      about: 'Acerca de',
      contact: 'Contacto',
      cart: 'Carrito',
      search: 'Buscar',
      newArrival: 'NOVEDADES',
      bestSellers: 'MÁS VENDIDOS',
      factory: 'FÁBRICA',
      allCategories: 'TODAS LAS CATEGORÍAS',
      aboutEbBelle: 'ACERCA DE E.B.BELLE',
      contactUs: 'CONTÁCTENOS',
      orderTracking: 'Seguimiento de pedido',
      menu: 'MENÚ'
    },
    product: {
      addToCart: 'Añadir al carrito',
      buyNow: 'Comprar ahora',
      quantity: 'Cantidad',
      inStock: 'En stock',
      outOfStock: 'Agotado',
      selectOptions: 'Seleccionar opciones',
      description: 'Descripción',
      details: 'Detalles',
      specifications: 'Especificaciones',
      reviews: 'Reseñas',
      relatedProducts: 'Productos relacionados',
      youMayAlsoLike: 'También te puede gustar',
      home: 'Inicio',
      size: 'Tamaño',
      color: 'Color',
      material: 'Material',
      selectSize: 'Seleccionar tamaño',
      selectColor: 'Seleccionar color',
      freeShipping: 'Envío gratis',
      giftPackaging: 'Embalaje de regalo disponible'
    },
    cart: {
      title: 'Carrito de compras',
      empty: 'Tu carrito está vacío',
      subtotal: 'Subtotal',
      total: 'Total',
      checkout: 'Finalizar compra',
      continueShopping: 'Seguir comprando',
      remove: 'Eliminar',
      updateCart: 'Actualizar carrito',
      itemsInBag: '{{count}} artículos en su carrito',
      promoCode: 'Código promocional',
      enterCouponCode: 'Ingrese código de cupón',
      apply: 'Aplicar',
      orderSummary: 'Resumen del pedido',
      shipping: 'Envío',
      estimatedTax: 'Impuesto estimado',
      estimatedTotal: 'Total estimado',
      proceedToCheckout: 'PROCEDER AL PAGO',
      clearAll: 'Borrar todo',
      product: 'Producto',
      price: 'Precio',
      quantity: 'Cantidad',
      weAccept: 'ACEPTAMOS',
      safeCheckout: 'Pago seguro garantizado'
    },
    shop: {
      filters: 'Filtros',
      sortBy: 'Ordenar por',
      showing: 'Mostrando',
      products: 'productos',
      priceRange: 'Rango de precio',
      categories: 'Categorías',
      colors: 'Colores',
      materials: 'Materiales',
      applyFilters: 'Aplicar filtros',
      clearFilters: 'Borrar todo',
      noProductsFound: 'No se encontraron productos',
      loadMore: 'Cargar más',
      sortFeatured: 'Destacado',
      sortPriceAsc: 'Precio: Menor a mayor',
      sortPriceDesc: 'Precio: Mayor a menor',
      sortNewest: 'Más reciente',
      sortPopular: 'Más popular',
      gridView: 'Vista cuadrícula',
      listView: 'Vista lista'
    },
    checkout: {
      title: 'Pagar',
      shippingAddress: 'Dirección de envío',
      billingAddress: 'Dirección de facturación',
      paymentMethod: 'Método de pago',
      placeOrder: 'Realizar pedido',
      orderSummary: 'Resumen del pedido',
      firstName: 'Nombre',
      lastName: 'Apellido',
      email: 'Correo electrónico',
      phone: 'Teléfono',
      address: 'Dirección',
      city: 'Ciudad',
      state: 'Estado',
      zipCode: 'Código postal',
      country: 'País',
      continueToPayment: 'Continuar al pago',
      continueShopping: 'Seguir comprando',
      orderConfirmed: '¡Pedido confirmado!',
      thankYouForPurchase: 'Gracias por su compra',
      orderNumber: 'Número de pedido',
      orderDate: 'Fecha del pedido',
      total: 'Total',
      subtotal: 'Subtotal',
      shipping: 'Envío',
      tax: 'Impuesto',
      creditCard: 'Tarjeta de crédito',
      paypal: 'PayPal'
    },
    common: {
      loading: 'Cargando...',
      error: 'Error',
      success: 'Éxito',
      close: 'Cerrar',
      cancel: 'Cancelar',
      confirm: 'Confirmar',
      save: 'Guardar',
      edit: 'Editar',
      delete: 'Eliminar',
      search: 'Buscar',
      filter: 'Filtrar',
      sortBy: 'Ordenar por',
      showMore: 'Mostrar más',
      showLess: 'Mostrar menos'
    },
    footer: {
      aboutUs: 'Acerca de',
      customerService: 'Servicio al cliente',
      followUs: 'Síguenos',
      newsletter: 'Boletín',
      subscribeNewsletter: 'Suscríbete a nuestro boletín',
      enterEmail: 'Ingresa tu correo',
      subscribe: 'Suscribirse',
      allRightsReserved: 'Todos los derechos reservados',
      newsletterHeading: 'OBTENGA UN 10% DE DESCUENTO EN SU PRIMER PEDIDO',
      emailPlaceholder: 'Ingrese su dirección de correo electrónico',
      privacyAgreement: 'Al obtener un 10% de descuento, acepta nuestra',
      securityPrivacy: 'Seguridad y privacidad',
      help: 'AYUDA',
      moreInfo: 'MÁS INFO',
      faqs: 'Preguntas frecuentes',
      shipping: 'Envío',
      returns: 'Devoluciones',
      materialsCare: 'Materiales y cuidado',
      ringSizeGuide: 'Guía de tallas de anillos',
      sizeGuide: 'Guía de tallas',
      contactUs: 'Contáctenos',
      about: 'Acerca de E.B.belle',
      showroom: 'Nuestro showroom',
      wholesale: 'Mayorista',
      dropshipping: 'Dropshipping',
      oemOdm: 'OEM & ODM',
      blog: 'Blog',
      offers: 'Ofertas y promociones',
      terms: 'Términos y condiciones',
      privacy: 'Privacidad y seguridad',
      collection: 'Colección',
      product: 'Producto',
      trackingOrder: 'Seguimiento de pedido',
      copyright: '© 2026 E.B.belle Limited. Todos los derechos reservados.'
    },
    seo: {
      homeTitle: 'E.B.Belle - Joyería y Accesorios Elegantes',
      homeDescription: 'Descubre nuestra colección de joyería y accesorios elegantes. Artesanía de alta calidad y diseños atemporales.',
      shopTitle: 'Tienda de Joyería - E.B.Belle',
      shopDescription: 'Explora nuestra colección completa de joyería elegante, incluyendo collares, aretes, pulseras y anillos.'
    },
    cartDrawer: {
      title: 'Carrito',
      freeShippingProgress: "Está a <span class=\"highlight\">50,00€</span> de <strong>¡ENVÍO GRATIS!</strong>",
      freeShippingAchieved: '<strong>¡Felicitaciones! ¡Ha desbloqueado ENVÍO GRATIS!</strong>',
      current: 'ACTUAL',
      goal: 'OBJETIVO',
      estimatedTax: 'Impuesto estimado',
      calculatedAtCheckout: 'Calculado al pagar',
      shipping: 'Envío',
      calculatedNextStep: 'Calculado en el siguiente paso',
      subtotal: 'Subtotal',
      checkout: 'FINALIZAR COMPRA',
      viewCart: 'VER CARRITO',
      secureCheckout: 'PAGO SEGURO GARANTIZADO',
      emptyCart: 'Su carrito está actualmente vacío',
      continueShopping: 'CONTINUAR COMPRANDO'
    },
    auth: {
      signIn: 'Iniciar sesión',
      createAccount: 'Crear cuenta',
      continueWithGoogle: 'Continuar con Google',
      signUpWithGoogle: 'Registrarse con Google',
      orContinueWithEmail: 'o continuar con correo electrónico',
      emailAddress: 'Dirección de correo electrónico',
      emailPlaceholder: 'nombre@ejemplo.com',
      password: 'Contraseña',
      passwordPlaceholder: '••••••••',
      createPassword: 'Crear contraseña',
      passwordMinLength: 'Mín. 8 caracteres',
      rememberMe: 'Recordarme',
      forgotPassword: '¿Olvidó su contraseña?',
      signInButton: 'INICIAR SESIÓN',
      firstName: 'Nombre',
      lastName: 'Apellido',
      firstNamePlaceholder: 'Juan',
      lastNamePlaceholder: 'García',
      termsAgreement: 'Al crear una cuenta, acepta nuestros',
      terms: 'Términos',
      privacyPolicy: 'Política de privacidad',
      joinButton: 'UNIRSE A E.B.BELLE',
      brandDescription: 'Joyería Fina & Elegancia Atemporal',
      perk1: 'Recompensas exclusivas y acceso anticipado',
      perk2: 'Guardar favoritos y crear lista de deseos',
      perk3: 'Rastrear pedidos y ver historial de compras',
      perk4: 'Promociones especiales y descuentos de cumpleaños',
      perk5: 'Múltiples pasarelas de pago cifradas seguras'
    },
    mobileMenu: {
      home: 'Inicio',
      category: 'Categoría',
      wishlist: 'Favoritos',
      cart: 'Carrito',
      account: 'Cuenta'
    }
  }
};

/**
 * 获取翻译文本
 */
export function t(locale: SupportedLocale, key: string): string {
  const keys = key.split('.');
  let value: any = translations[locale];

  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k];
    } else {
      return key; // 返回 key 本身作为降级
    }
  }

  return typeof value === 'string' ? value : key;
}
