// Add only approved temple photos and verified payment details.
window.TEMPLE_CONFIG = {
  // Nagaur city reference point for the daily sunrise Panchang (not a temple GPS pin).
  panchang: { latitude: 27.2021, longitude: 73.7331, place: 'Nagaur' },
  whatsappGroupUrl: 'https://chat.whatsapp.com/HeOJ7XRG8hgAHOLx8sb0lc',
  committee: {
    president: { name: { hi: '', en: '' }, mobile: '' },
    secretary: { name: { hi: '', en: '' }, mobile: '' },
    treasurer: { name: { hi: '', en: '' }, mobile: '' }
  },
  gaushala: {
    name: { hi: 'श्री कालका माता मंदिर गौशाला', en: 'Shri Kalka Mata Temple Gaushala' },
    description: {
      hi: 'मंदिर द्वारा संचालित: यह गौशाला समस्त मंदिर द्वारा संचालित की जाती है, जिसमें खुड़खुड़ा कलां सहित खुड़खुड़ा के तीनों गाँवों का पूरा सहयोग मिलता है।\n\nदान का उपयोग: मंदिर में आने वाले दान का उपयोग मंदिर के कार्यों के साथ-साथ गौशाला में पल रही गौ-माताओं के चारे और देखभाल के लिए भी किया जाता है।\n\nगौ-सेवा: श्रद्धालु माता के दर्शनों के साथ-साथ यहाँ गौ-सेवा करके पुण्य भी प्राप्त कर सकते हैं।',
      en: 'Run by the temple: This gaushala is operated by the temple, with full support from all three Khudkhuda villages, including Khudkhuda Kalan.\n\nUse of donations: Donations received by the temple support temple activities as well as fodder and care for the cows living in the gaushala.\n\nGau Seva: Alongside darshan of Mata, devotees can also earn spiritual merit by serving the cows here.'
    },
    address: { hi: 'खुड़खुड़ा कलां', en: 'Khudkhuda Kalan' },
    contactName: { hi: 'सम्पत खुड़खुड़िया', en: 'Sampat Khudkhudiya' },
    mobile: '9829406056'
  },
  gallery: [], // [{ title: 'माता रानी के दर्शन', url: 'assets/actual-temple-photo.jpg' }]
  donations: {
    verified: true, // User supplied the details; the attached QR's UPI recipient was decoded and matched.
    showPopupOnOpen: true,
    upiId: '8890624926-2@ybl',
    payeeName: 'Mahipal Khurkhuriya',
    qrImage: 'assets/temple-donation-qr.png',
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    ifsc: ''
  }
};
