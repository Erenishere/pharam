const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../../src/models/User');

describe('User Model', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'admin'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.username).toBe(userData.username);
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.role).toBe(userData.role);
      expect(savedUser.isActive).toBe(true);
      expect(savedUser.password).not.toBe(userData.password); // Should be hashed
    });

    it('should require username', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        role: 'admin'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow('Username is required');
    });

    it('should require email', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
        role: 'admin'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow('Email is required');
    });

    it('should validate email format', async () => {
      const userData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123',
        role: 'admin'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow('Please enter a valid email');
    });

    it('should validate role enum', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'invalid_role'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });

    it('should enforce unique username', async () => {
      const userData = {
        username: 'testuser',
        email: 'test1@example.com',
        password: 'password123',
        role: 'admin'
      };

      await new User(userData).save();

      const duplicateUser = new User({
        ...userData,
        email: 'test2@example.com'
      });

      await expect(duplicateUser.save()).rejects.toThrow();
    });

    it('should enforce unique email', async () => {
      const userData = {
        username: 'testuser1',
        email: 'test@example.com',
        password: 'password123',
        role: 'admin'
      };

      await new User(userData).save();

      const duplicateUser = new User({
        ...userData,
        username: 'testuser2'
      });

      await expect(duplicateUser.save()).rejects.toThrow();
    });
  });

  describe('Password Hashing', () => {
    it('should hash password before saving', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'admin'
      };

      const user = new User(userData);
      await user.save();

      expect(user.password).not.toBe('password123');
      expect(user.password.length).toBeGreaterThan(20);
    });

    it('should not rehash password if not modified', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'admin'
      };

      const user = new User(userData);
      await user.save();
      const originalHash = user.password;

      user.username = 'updateduser';
      await user.save();

      expect(user.password).toBe(originalHash);
    });
  });

  describe('Instance Methods', () => {
    let user;

    beforeEach(async () => {
      user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'admin'
      });
      await user.save();
    });

    it('should compare password correctly', async () => {
      const isMatch = await user.comparePassword('password123');
      expect(isMatch).toBe(true);

      const isNotMatch = await user.comparePassword('wrongpassword');
      expect(isNotMatch).toBe(false);
    });

    it('should update last login', async () => {
      expect(user.lastLogin).toBeNull();

      await user.updateLastLogin();
      expect(user.lastLogin).toBeInstanceOf(Date);
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      await User.create([
        {
          username: 'admin1',
          email: 'admin1@example.com',
          password: 'password123',
          role: 'admin',
          isActive: true
        },
        {
          username: 'admin2',
          email: 'admin2@example.com',
          password: 'password123',
          role: 'admin',
          isActive: false
        },
        {
          username: 'sales1',
          email: 'sales1@example.com',
          password: 'password123',
          role: 'sales',
          isActive: true
        }
      ]);
    });

    it('should find active users by role', async () => {
      const activeAdmins = await User.findActiveByRole('admin');
      expect(activeAdmins).toHaveLength(1);
      expect(activeAdmins[0].username).toBe('admin1');

      const activeSales = await User.findActiveByRole('sales');
      expect(activeSales).toHaveLength(1);
      expect(activeSales[0].username).toBe('sales1');
    });
  });

  describe('JSON Transform', () => {
    it('should exclude password from JSON output', async () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'admin'
      });
      await user.save();

      const userJson = user.toJSON();
      expect(userJson.password).toBeUndefined();
      expect(userJson.username).toBe('testuser');
    });
  });
});