// index.ts
import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRoutes from './routes/auth.routes';
import propertyRoutes from './routes/property.routes';
import landlordRoutes from './routes/landlord.routes';
import rentalRoutes from './routes/rental.routes';
import paymentRoutes from './routes/payment.routes';
import reviewRoutes from './routes/review.routes';
import adminRoutes from './routes/admin.routes';
import { notFound, errorHandler } from './middleware/errorHandler';

const app = express();

app.use(helmet());
app.use(cors());

// Increase body size limit for images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(morgan('dev'));

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'RentNest API is running',
    developer: 'S M Samiul Hasan',
    errorDetails: null,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api', propertyRoutes);
app.use('/api/landlord', landlordRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`RentNest API running on http://localhost:${PORT}`);
});