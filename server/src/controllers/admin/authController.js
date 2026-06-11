import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findByUsername } from '../../models/adminModel.js';

export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const admin = await findByUsername(username);
    if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: admin.id, username: admin.username }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });
    res.json({ token });
  } catch (err) {
    next(err);
  }
};
