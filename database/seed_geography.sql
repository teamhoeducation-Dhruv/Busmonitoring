-- Robust Seed file for Gujarat Districts and Talukas

-- 1. Create Talukas Table
CREATE TABLE IF NOT EXISTS talukas (
    id SERIAL PRIMARY KEY,
    district_id INTEGER REFERENCES districts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    UNIQUE(district_id, name)
);

-- 2. Function to safely insert districts and their respective talukas
DO $$
DECLARE
    d_id INTEGER;
BEGIN
    -- For each district, we insert the district and then its talukas
    
    -- Ahmedabad
    INSERT INTO districts (name, slug) VALUES ('Ahmedabad', 'ahmedabad') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO d_id;
    INSERT INTO talukas (district_id, name) VALUES 
    (d_id, 'Ahmedabad City'), (d_id, 'Bavla'), (d_id, 'Daskroi'), (d_id, 'Detroj-Rampura'), (d_id, 'Dhandhuka'), (d_id, 'Dholera'), (d_id, 'Dholka'), (d_id, 'Mandal'), (d_id, 'Sanand'), (d_id, 'Viramgam') ON CONFLICT DO NOTHING;

    -- Amreli
    INSERT INTO districts (name, slug) VALUES ('Amreli', 'amreli') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO d_id;
    INSERT INTO talukas (district_id, name) VALUES 
    (d_id, 'Amreli'), (d_id, 'Babra'), (d_id, 'Bagasara'), (d_id, 'Dhari'), (d_id, 'Jafrabad'), (d_id, 'Khambha'), (d_id, 'Kunkavav vadia'), (d_id, 'Lathi'), (d_id, 'Lilia'), (d_id, 'Rajula'), (d_id, 'Savarkundla') ON CONFLICT DO NOTHING;

    -- Anand
    INSERT INTO districts (name, slug) VALUES ('Anand', 'anand') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO d_id;
    INSERT INTO talukas (district_id, name) VALUES 
    (d_id, 'Anand'), (d_id, 'Anklav'), (d_id, 'Borsad'), (d_id, 'Khambhat'), (d_id, 'Petlad'), (d_id, 'Sojitra'), (d_id, 'Tarapur'), (d_id, 'Umreth') ON CONFLICT DO NOTHING;

    -- Aravalli
    INSERT INTO districts (name, slug) VALUES ('Aravalli', 'aravalli') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO d_id;
    INSERT INTO talukas (district_id, name) VALUES 
    (d_id, 'Bayad'), (d_id, 'Bhiloda'), (d_id, 'Dhansura'), (d_id, 'Malpur'), (d_id, 'Meghraj'), (d_id, 'Modasa') ON CONFLICT DO NOTHING;

    -- Banaskantha
    INSERT INTO districts (name, slug) VALUES ('Banaskantha', 'banaskantha') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO d_id;
    INSERT INTO talukas (district_id, name) VALUES 
    (d_id, 'Amirgadh'), (d_id, 'Bhabhar'), (d_id, 'Danta'), (d_id, 'Dantiwada'), (d_id, 'Deesa'), (d_id, 'Deodar'), (d_id, 'Dhanera'), (d_id, 'Lakhani'), (d_id, 'Palanpur'), (d_id, 'Suigam'), (d_id, 'Tharad'), (d_id, 'Vadgam'), (d_id, 'Vav') ON CONFLICT DO NOTHING;

    -- Bharuch
    INSERT INTO districts (name, slug) VALUES ('Bharuch', 'bharuch') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO d_id;
    INSERT INTO talukas (district_id, name) VALUES 
    (d_id, 'Bharuch'), (d_id, 'Ankleshwar'), (d_id, 'Hansot'), (d_id, 'Jambusar'), (d_id, 'Jhagadia'), (d_id, 'Netrang'), (d_id, 'Palej'), (d_id, 'Vagra'), (d_id, 'Valia') ON CONFLICT DO NOTHING;

    -- Bhavnagar
    INSERT INTO districts (name, slug) VALUES ('Bhavnagar', 'bhavnagar') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO d_id;
    INSERT INTO talukas (district_id, name) VALUES 
    (d_id, 'Bhavnagar'), (d_id, 'Gariadhar'), (d_id, 'Ghogha'), (d_id, 'Jejuri'), (d_id, 'Mahuva'), (d_id, 'Palitana'), (d_id, 'Sihor'), (d_id, 'Talaja'), (d_id, 'Umrala'), (d_id, 'Vallabhipur') ON CONFLICT DO NOTHING;

    -- Botad
    INSERT INTO districts (name, slug) VALUES ('Botad', 'botad') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO d_id;
    INSERT INTO talukas (district_id, name) VALUES 
    (d_id, 'Botad'), (d_id, 'Barwala'), (d_id, 'Gadhada'), (d_id, 'Ranpur') ON CONFLICT DO NOTHING;

    -- Chhota Udepur
    INSERT INTO districts (name, slug) VALUES ('Chhota Udepur', 'chhota-udepur') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO d_id;
    INSERT INTO talukas (district_id, name) VALUES 
    (d_id, 'Chhota Udepur'), (d_id, 'Bodeli'), (d_id, 'Jetpur pavi'), (d_id, 'Kavant'), (d_id, 'Nasvadi'), (d_id, 'Sankheda') ON CONFLICT DO NOTHING;

    -- Dahod
    INSERT INTO districts (name, slug) VALUES ('Dahod', 'dahod') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO d_id;
    INSERT INTO talukas (district_id, name) VALUES 
    (d_id, 'Dahod'), (d_id, 'Devgadh baria'), (d_id, 'Dhanpur'), (d_id, 'Fatepura'), (d_id, 'Garbada'), (d_id, 'Limkheda'), (d_id, 'Sanjeli'), (d_id, 'Zalod') ON CONFLICT DO NOTHING;

    -- Dang
    INSERT INTO districts (name, slug) VALUES ('Dang', 'dang') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO d_id;
    INSERT INTO talukas (district_id, name) VALUES 
    (d_id, 'Ahwa'), (d_id, 'Subir'), (d_id, 'Waghai') ON CONFLICT DO NOTHING;

    -- Devbhumi Dwarka
    INSERT INTO districts (name, slug) VALUES ('Devbhumi Dwarka', 'devbhumi-dwarka') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO d_id;
    INSERT INTO talukas (district_id, name) VALUES 
    (d_id, 'Bhanvad'), (d_id, 'Kalyanpur'), (d_id, 'Khambhalia'), (d_id, 'Okhamandal') ON CONFLICT DO NOTHING;

    -- Gandhinagar
    INSERT INTO districts (name, slug) VALUES ('Gandhinagar', 'gandhinagar') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO d_id;
    INSERT INTO talukas (district_id, name) VALUES 
    (d_id, 'Gandhinagar'), (d_id, 'Dehgam'), (d_id, 'Kalol'), (d_id, 'Mansa') ON CONFLICT DO NOTHING;

    -- Gir Somnath
    INSERT INTO districts (name, slug) VALUES ('Gir Somnath', 'gir-somnath') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO d_id;
    INSERT INTO talukas (district_id, name) VALUES 
    (d_id, 'Gir Gadhada'), (d_id, 'Kodinar'), (d_id, 'Patan-Veraval'), (d_id, 'Sutrapada'), (d_id, 'Talala'), (d_id, 'Una') ON CONFLICT DO NOTHING;

    -- Jamnagar
    INSERT INTO districts (name, slug) VALUES ('Jamnagar', 'jamnagar') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO d_id;
    INSERT INTO talukas (district_id, name) VALUES 
    (d_id, 'Jamnagar'), (d_id, 'Dhrol'), (d_id, 'Jamjodhpur'), (d_id, 'Jodiya'), (d_id, 'Kalavad'), (d_id, 'Lalpur') ON CONFLICT DO NOTHING;

    -- Junagadh
    INSERT INTO districts (name, slug) VALUES ('Junagadh', 'junagadh') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO d_id;
    INSERT INTO talukas (district_id, name) VALUES 
    (d_id, 'Junagadh'), (d_id, 'Bhesan'), (d_id, 'Keshod'), (d_id, 'Malia'), (d_id, 'Manavadar'), (d_id, 'Mangrol'), (d_id, 'Mendarda'), (d_id, 'Vanthali'), (d_id, 'Visavadar') ON CONFLICT DO NOTHING;

    -- Kheda
    INSERT INTO districts (name, slug) VALUES ('Kheda', 'kheda') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO d_id;
    INSERT INTO talukas (district_id, name) VALUES 
    (d_id, 'Nadiad'), (d_id, 'Galteshwar'), (d_id, 'Kapadvanj'), (d_id, 'Kathlal'), (d_id, 'Kheda'), (d_id, 'Mahudha'), (d_id, 'Matar'), (d_id, 'Mehmadabad'), (d_id, 'Thasra'), (d_id, 'Vaso') ON CONFLICT DO NOTHING;

    -- Kutch
    INSERT INTO districts (name, slug) VALUES ('Kutch', 'kutch') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO d_id;
    INSERT INTO talukas (district_id, name) VALUES 
    (d_id, 'Bhuj'), (d_id, 'Abdasa'), (d_id, 'Anjar'), (d_id, 'Bhachau'), (d_id, 'Gandhidham'), (d_id, 'Lakhpat'), (d_id, 'Mandvi'), (d_id, 'Mundra'), (d_id, 'Nakhatrana'), (d_id, 'Rapar') ON CONFLICT DO NOTHING;

    -- Mahisagar
    INSERT INTO districts (name, slug) VALUES ('Mahisagar', 'mahisagar') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO d_id;
    INSERT INTO talukas (district_id, name) VALUES 
    (d_id, 'Balasinor'), (d_id, 'Kadana'), (d_id, 'Khanpur'), (d_id, 'Lunawada'), (d_id, 'Santrampur'), (d_id, 'Virpur') ON CONFLICT DO NOTHING;

    -- Mehsana
    INSERT INTO districts (name, slug) VALUES ('Mehsana', 'mehsana') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO d_id;
    INSERT INTO talukas (district_id, name) VALUES 
    (d_id, 'Mehsana'), (d_id, 'Becharaji'), (d_id, 'Kadi'), (d_id, 'Kheralu'), (d_id, 'Satlasana'), (d_id, 'Unjha'), (d_id, 'Vadnagar'), (d_id, 'Vijapur'), (d_id, 'Visnagar') ON CONFLICT DO NOTHING;

    -- Morbi
    INSERT INTO districts (name, slug) VALUES ('Morbi', 'morbi') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO d_id;
    INSERT INTO talukas (district_id, name) VALUES 
    (d_id, 'Morbi'), (d_id, 'Halvad'), (d_id, 'Maliya'), (d_id, 'Tankara'), (d_id, 'Wankaner') ON CONFLICT DO NOTHING;

    -- Narmada
    INSERT INTO districts (name, slug) VALUES ('Narmada', 'narmada') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO d_id;
    INSERT INTO talukas (district_id, name) VALUES 
    (d_id, 'Rajpipla'), (d_id, 'Dediapada'), (d_id, 'Garudeshwar'), (d_id, 'Sagbara'), (d_id, 'Tilakwada') ON CONFLICT DO NOTHING;

    -- Navsari
    INSERT INTO districts (name, slug) VALUES ('Navsari', 'navsari') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO d_id;
    INSERT INTO talukas (district_id, name) VALUES 
    (d_id, 'Navsari'), (d_id, 'Bansda'), (d_id, 'Chikhli'), (d_id, 'Gandevi'), (d_id, 'Jalalpore'), (d_id, 'Khergam') ON CONFLICT DO NOTHING;

    -- Panchmahal
    INSERT INTO districts (name, slug) VALUES ('Panchmahal', 'panchmahal') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO d_id;
    INSERT INTO talukas (district_id, name) VALUES 
    (d_id, 'Godhra'), (d_id, 'Ghoghamba'), (d_id, 'Halol'), (d_id, 'Jambughoda'), (d_id, 'Kalol'), (d_id, 'Morwa Hadaf'), (d_id, 'Shehera') ON CONFLICT DO NOTHING;

    -- Patan
    INSERT INTO districts (name, slug) VALUES ('Patan', 'patan') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO d_id;
    INSERT INTO talukas (district_id, name) VALUES 
    (d_id, 'Patan'), (d_id, 'Chanasma'), (d_id, 'Harij'), (d_id, 'Radhanpur'), (d_id, 'Sami'), (d_id, 'Santalpur'), (d_id, 'Sarasvati'), (d_id, 'Shidhdhpur'), (d_id, 'Vagdod') ON CONFLICT DO NOTHING;

    -- Porbandar
    INSERT INTO districts (name, slug) VALUES ('Porbandar', 'porbandar') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO d_id;
    INSERT INTO talukas (district_id, name) VALUES 
    (d_id, 'Porbandar'), (d_id, 'Kutiyana'), (d_id, 'Ranavav') ON CONFLICT DO NOTHING;

    -- Rajkot
    INSERT INTO districts (name, slug) VALUES ('Rajkot', 'rajkot') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO d_id;
    INSERT INTO talukas (district_id, name) VALUES 
    (d_id, 'Rajkot'), (d_id, 'Dhoraji'), (d_id, 'Gondal'), (d_id, 'Jamkandorna'), (d_id, 'Jasdan'), (d_id, 'Jetpur'), (d_id, 'Kotda Sangani'), (d_id, 'Lodhika'), (d_id, 'Paddhari'), (d_id, 'Upleta'), (d_id, 'Vinchchiya') ON CONFLICT DO NOTHING;

    -- Sabarkantha
    INSERT INTO districts (name, slug) VALUES ('Sabarkantha', 'sabarkantha') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO d_id;
    INSERT INTO talukas (district_id, name) VALUES 
    (d_id, 'Himmatnagar'), (d_id, 'Idar'), (d_id, 'Khedbrahma'), (d_id, 'Poshina'), (d_id, 'Prantij'), (d_id, 'Talod'), (d_id, 'Vadali'), (d_id, 'Vijaynagar') ON CONFLICT DO NOTHING;

    -- Surat
    INSERT INTO districts (name, slug) VALUES ('Surat', 'surat') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO d_id;
    INSERT INTO talukas (district_id, name) VALUES 
    (d_id, 'Surat'), (d_id, 'Bardoli'), (d_id, 'Choryasi'), (d_id, 'Kamrej'), (d_id, 'Mahuva'), (d_id, 'Mandvi'), (d_id, 'Olpad'), (d_id, 'Palsana'), (d_id, 'Umarpada') ON CONFLICT DO NOTHING;

    -- Surendranagar
    INSERT INTO districts (name, slug) VALUES ('Surendranagar', 'surendranagar') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO d_id;
    INSERT INTO talukas (district_id, name) VALUES 
    (d_id, 'Wadhwan'), (d_id, 'Chotila'), (d_id, 'Chuda'), (d_id, 'Dasada'), (d_id, 'Dhrangadhra'), (d_id, 'Lakhtar'), (d_id, 'Limbdi'), (d_id, 'Muli'), (d_id, 'Sayla'), (d_id, 'Thangadh') ON CONFLICT DO NOTHING;

    -- Tapi
    INSERT INTO districts (name, slug) VALUES ('Tapi', 'tapi') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO d_id;
    INSERT INTO talukas (district_id, name) VALUES 
    (d_id, 'Vyara'), (d_id, 'Dolvan'), (d_id, 'Kukarmunda'), (d_id, 'Nizar'), (d_id, 'Songadh'), (d_id, 'Uchchhal'), (d_id, 'Valod') ON CONFLICT DO NOTHING;

    -- Vadodara
    INSERT INTO districts (name, slug) VALUES ('Vadodara', 'vadodara') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO d_id;
    INSERT INTO talukas (district_id, name) VALUES 
    (d_id, 'Vadodara'), (d_id, 'Dabhoi'), (d_id, 'Desar'), (d_id, 'Karjan'), (d_id, 'Padra'), (d_id, 'Savli'), (d_id, 'Shinork'), (d_id, 'Waghodia') ON CONFLICT DO NOTHING;

    -- Valsad
    INSERT INTO districts (name, slug) VALUES ('Valsad', 'valsad') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO d_id;
    INSERT INTO talukas (district_id, name) VALUES 
    (d_id, 'Valsad'), (d_id, 'Dharampur'), (d_id, 'Kaprada'), (d_id, 'Pardi'), (d_id, 'Umbergaon'), (d_id, 'Vapi') ON CONFLICT DO NOTHING;

END $$;
