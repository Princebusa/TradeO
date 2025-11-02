import {Router} from 'express';
import jwt from 'jsonwebtoken';
import {Response, Request} from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const client = new PrismaClient();

const router = Router();

router.post('/signup', async (req: Request, res: Response) => {
    try {
        const { email, name, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'email and password are required' });
        }

        const existUser = await client.user.findFirst({
            where: { email }
        });

        if (existUser) {
            return res.status(409).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await client.user.create({
            data: {
                email,
                name,
                password: hashedPassword
            } as any
        });

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'defaultsecret', { expiresIn: '1h' });

        return res.status(201).json({message: "user created successfully", token });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});


router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;   
        if (!email || !password) {
            return res.status(400).json({ error: 'email and password are required' });
        }
        const user = await client.user.findFirst({
            where: { email }
        });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'defaultsecret', { expiresIn: '1h' });

        return res.status(200).json({ message: "login successful", token });
        
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;



