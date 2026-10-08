# श्री कालका माता मंदिर

GitHub Pages पर चलने वाली हिन्दी/English वेबसाइट और Supabase admin panel।

Repository के root में index.html रखें। GitHub Settings → Pages में main और /(root) चुनें।
Admin login: /admin/। Photos, donations और सामग्री Supabase में प्रकाशित होती हैं।

पहले Supabase में इस पैकेज का setup SQL चलाएँ, फिर मुख्य admin account और owner अनुमति बनाएँ।
विस्तृत प्रक्रिया अलग github-supabase-guide.md में दी गई है।

इस वेबसाइट में Supabase publishable key public है। Server admin की अनुमति जाँचता है।
यह तैयार static release है; npm build की ज़रूरत नहीं है।
