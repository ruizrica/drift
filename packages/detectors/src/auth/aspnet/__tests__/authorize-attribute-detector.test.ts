/**
 * Tests for ASP.NET Authorize Attribute Detector
 */

import { describe, it, expect } from 'vitest';
import { AuthorizeAttributeDetector } from '../authorize-attribute-detector.js';

describe('AuthorizeAttributeDetector', () => {
  const detector = new AuthorizeAttributeDetector();

  describe('analyzeAuthorization', () => {
    it('should detect basic [Authorize] attribute on controller', () => {
      const content = `
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    [HttpGet]
    public IActionResult GetAll() => Ok();
}
`;
      const analysis = detector.analyzeAuthorization(content, 'UsersController.cs');
      
      expect(analysis.attributes).toHaveLength(1);
      expect(analysis.attributes[0]?.type).toBe('authorize');
      expect(analysis.attributes[0]?.isControllerLevel).toBe(true);
      expect(analysis.attributes[0]?.target).toBe('UsersController');
      expect(analysis.authorizedControllers).toContain('UsersController');
    });

    it('should detect [Authorize(Roles = "...")] with roles', () => {
      const content = `
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Manager")]
public class AdminController : ControllerBase
{
    [HttpGet]
    public IActionResult GetDashboard() => Ok();
}
`;
      const analysis = detector.analyzeAuthorization(content, 'AdminController.cs');
      
      expect(analysis.attributes).toHaveLength(1);
      expect(analysis.attributes[0]?.type).toBe('authorize-roles');
      expect(analysis.attributes[0]?.roles).toEqual(['Admin', 'Manager']);
      expect(analysis.roles).toContain('Admin');
      expect(analysis.roles).toContain('Manager');
    });

    it('should detect [Authorize(Policy = "...")] with policy', () => {
      const content = `
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "RequireAdminRole")]
public class SettingsController : ControllerBase
{
    [HttpGet]
    public IActionResult GetSettings() => Ok();
}
`;
      const analysis = detector.analyzeAuthorization(content, 'SettingsController.cs');
      
      expect(analysis.attributes).toHaveLength(1);
      expect(analysis.attributes[0]?.type).toBe('authorize-policy');
      expect(analysis.attributes[0]?.policy).toBe('RequireAdminRole');
      expect(analysis.policies).toContain('RequireAdminRole');
    });

    it('should detect [AllowAnonymous] on actions', () => {
      const content = `
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AccountController : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    public IActionResult Login([FromBody] LoginRequest request) => Ok();

    [HttpGet("profile")]
    public IActionResult GetProfile() => Ok();
}
`;
      const analysis = detector.analyzeAuthorization(content, 'AccountController.cs');
      
      expect(analysis.attributes).toHaveLength(2);
      expect(analysis.anonymousActions).toContain('AccountController.Login');
      expect(analysis.authorizedControllers).toContain('AccountController');
    });

    it('should detect action-level authorization', () => {
      const content = `
[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    [HttpGet]
    public IActionResult GetAll() => Ok();

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public IActionResult Create([FromBody] ProductDto dto) => Ok();

    [HttpDelete("{id}")]
    [Authorize(Policy = "CanDeleteProducts")]
    public IActionResult Delete(int id) => Ok();
}
`;
      const analysis = detector.analyzeAuthorization(content, 'ProductsController.cs');
      
      expect(analysis.attributes).toHaveLength(2);
      expect(analysis.authorizedActions).toContain('ProductsController.Create');
      expect(analysis.authorizedActions).toContain('ProductsController.Delete');
      expect(analysis.roles).toContain('Admin');
      expect(analysis.policies).toContain('CanDeleteProducts');
    });

    it('should detect authentication schemes', () => {
      const content = `
[ApiController]
[Route("api/[controller]")]
[Authorize(AuthenticationSchemes = "Bearer,Cookie")]
public class SecureController : ControllerBase
{
    [HttpGet]
    public IActionResult GetData() => Ok();
}
`;
      const analysis = detector.analyzeAuthorization(content, 'SecureController.cs');
      
      expect(analysis.attributes).toHaveLength(1);
      expect(analysis.attributes[0]?.authenticationSchemes).toEqual(['Bearer', 'Cookie']);
    });
  });

  describe('detect', () => {
    it('should return patterns for authorized endpoints', async () => {
      const context = {
        content: `
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    [HttpGet]
    public IActionResult GetAll() => Ok();
}
`,
        file: 'UsersController.cs',
        language: 'csharp' as const,
        isTestFile: false,
        isTypeDefinition: false,
      };

      const result = await detector.detect(context);
      
      expect(result.patterns.length).toBeGreaterThan(0);
      expect(result.patterns[0]?.patternId).toContain('auth/aspnet-authorize-attribute');
    });

    it('should warn about [AllowAnonymous] on sensitive endpoints', async () => {
      const context = {
        content: `
[ApiController]
[Route("api/[controller]")]
public class AdminController : ControllerBase
{
    [HttpDelete("{id}")]
    [AllowAnonymous]
    public IActionResult DeleteUser(int id) => Ok();
}
`,
        file: 'AdminController.cs',
        language: 'csharp' as const,
        isTestFile: false,
        isTypeDefinition: false,
      };

      const result = await detector.detect(context);
      
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0]?.message).toContain('AllowAnonymous');
      expect(result.violations[0]?.message).toContain('sensitive');
    });

    it('should return empty result for non-controller files', async () => {
      const context = {
        content: `
public class UserService
{
    public User GetUser(int id) => new User();
}
`,
        file: 'UserService.cs',
        language: 'csharp' as const,
        isTestFile: false,
        isTypeDefinition: false,
      };

      const result = await detector.detect(context);
      
      expect(result.patterns).toHaveLength(0);
    });
  });

  describe('metadata', () => {
    it('should have correct detector metadata', () => {
      expect(detector.id).toBe('auth/aspnet-authorize-attribute');
      expect(detector.category).toBe('auth');
      expect(detector.supportedLanguages).toContain('csharp');
    });
  });
});

