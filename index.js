const express = require('express');
const multer = require("multer");
const { PrismaClient } = require ("@prisma/client");

const multiparty = require("multiparty");
const fs = require("fs");
const path = require("path");
const { error } = require('console');

const prisma = new PrismaClient();
const app = express();
const PORT = 3000;

app.use(express.urlencoded({extended:true}));
app.use(express.json());



app.get('/', (req, res)=>{
    res.send('Hello World')
});

//Endpoint para crear un nuevo usuario
app.post('/users/create', async (req,res) => {
    const { email, user_name, address, posts } = req.body;
    console.log(req.body);
    
    try{
        const newUser = await prisma.user.create({
            data: {
                email,
                user_name: user_name,
                address: {
                    create: {
                        street: address.street,
                        city: address.city,
                        state: address.state,
                        zip_code: address.zip_code,
                    },
                },
                posts: {
                    create: {
                        slug: posts.slug,
                        title: posts.title,
                        description: posts.description,
                    },
                },
            },
        });
        res.json(newUser);
    }catch(err){
        console.log(err);
        res.status(500).json({ error: 'Error al crear usuario' });
    }
});

//Endpoint para obtener todos los usuarios
app.get('/users', async (req, res)=> {
    try {
        const allUsers = await prisma.user.findMany();
        res.json(allUsers);
    } catch (err){
        res.status(500).json({ error: 'Error al obtener los usuarios' });
    }
});

//Endpoint para obtener un usuario por su id
app.get("/users/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const user = await prisma.user.findUnique({
            where: {
                id: parseInt(id),
            },
        });
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json(user);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Error al obtener usuario' });
    }
});

//Endpoint para editar un usuario por su id
app.patch("/users/edit/:id", async (req, res) => {
    const { id } = req.params;
    const { active } = req.body;
    try {
        const updatedUser = await prisma.user.update({
            where: {
                id: parseInt(id),
            },
            data: {
                active: !!active, // Convertimos a booleano
            },
        });
        res.json(updatedUser);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Error al editar usuario' });
    }
});


// Endpoint para actualizar un usuario por su id
app.patch("/users/update/:id", async (req, res) => {
    const { id } = req.params;
    const { user_name, email } = req.body;
    try {
        const user = await prisma.user.findUnique({
            where: { id },
            include: { posts: true, address: true },
        });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        await prisma.user.update({
            where: { id },
            data: {
                user_name,
                email
            },
        });

        res.json({message: "Usuario actualizado"});
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor', message: error.message });
    }
});

// Endpoint para eliminar un usuario por su id
app.delete('/users/delete/:id',  async (req, res) => {
    try {
        const {id} = req.params;
        const user = await prisma.user.findUnique({
            where: { id },
            include: { posts: true },
        });        

        if (!user){
            return res.status(404).json({error: 'Usuario no encontrado'});
        }

        if(user.posts.length > 0){
            await Promise.all(user.posts.map(async (post) => {
                await prisma.post.delete({where: { id: post.id }});
            }));
        }

        const deleteUser = await prisma.user.delete({ where: { id } });
        res.json(deleteUser);
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el usuario', message: error.message });
    }
});

app.post("/upload", handleFileUpload);

async function handleFileUpload(req, res) {
    const form = new multiparty.Form();

    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error("Error al analizar formulario:", err);
            return res.status(500).json({ msg: "Error del servidor" });
        }

        const imageFile = files.imageFile[0];
        const tempPath = imageFile.path;
        const originalFileName = imageFile.originalFilename;
        const fileExtension = originalFileName.split(".").pop();
        const currentTime = new Date().getTime();
        const fileName = `${currentTime}_${originalFileName}`;

        const uploadDir = "../../uploads/users";
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const targetPath = path.join(__dirname, uploadDir, fileName);

        fs.rename(tempPath, targetPath, async (err) => {
            if (err) {
                console.error("Error al mover archivo:", err);
                return res.status(500).json({ msg: "Error del servidor" });
            }

            res.status(200).json({ msg: "Imagen subida correctamente", fileName });
        });
    });
}

//PORT 3000
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
